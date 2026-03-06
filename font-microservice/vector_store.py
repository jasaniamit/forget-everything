"""
vector_store.py — PostgreSQL pgvector storage for font embeddings

Stores two types of vectors per font:
1. geometry_vector (12-dim)  — from glyph geometry fingerprinter
2. clip_vector    (512-dim)  — from CLIP ViT-B/32

At query time, computes cosine similarity and fuses both scores
into a final ranking.

Schema (created on first run):
  font_vectors table:
    font_id        INT PRIMARY KEY (FK to fonts table)
    font_name      TEXT
    font_family    TEXT
    geometry_vec   vector(12)
    clip_vec       vector(512)
    indexed_at     TIMESTAMP
"""

import os
import numpy as np
import psycopg2
from psycopg2.extras import execute_values
from typing import List, Tuple, Optional, Dict
import json
import numpy as np

class _NumpyEncoder(json.JSONEncoder):
    """Convert numpy types to native Python so json.dumps works."""
    def default(self, obj):
        if isinstance(obj, np.bool_):   return bool(obj)
        if isinstance(obj, np.integer): return int(obj)
        if isinstance(obj, np.floating): return float(obj)
        if isinstance(obj, np.ndarray): return obj.tolist()
        return super().default(obj)


def _get_conn():
    """Get database connection from DATABASE_URL env var."""
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable not set")
    return psycopg2.connect(db_url)


def setup_schema():
    """
    Create font_vectors table and enable pgvector extension.
    Safe to call multiple times (uses IF NOT EXISTS).
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            # Enable pgvector — Neon supports this natively
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
            
            # Create vectors table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS font_vectors (
                    font_id        INTEGER PRIMARY KEY,
                    font_name      TEXT NOT NULL,
                    font_family    TEXT NOT NULL,
                    geometry_vec   vector(12),
                    clip_vec       vector(512),
                    geometry_props JSONB,
                    indexed_at     TIMESTAMP DEFAULT NOW()
                );
            """)
            
            # Indexes for fast similarity search
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_font_vectors_clip
                ON font_vectors
                USING ivfflat (clip_vec vector_cosine_ops)
                WITH (lists = 50);
            """)
            
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_font_vectors_geometry
                ON font_vectors
                USING ivfflat (geometry_vec vector_cosine_ops)
                WITH (lists = 10);
            """)
            
        conn.commit()
        print("[VectorStore] Schema ready ✓")
    except Exception as e:
        conn.rollback()
        # ivfflat index requires data — create basic index instead
        try:
            with conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS font_vectors (
                        font_id        INTEGER PRIMARY KEY,
                        font_name      TEXT NOT NULL,
                        font_family    TEXT NOT NULL,
                        geometry_vec   vector(12),
                        clip_vec       vector(512),
                        geometry_props JSONB,
                        indexed_at     TIMESTAMP DEFAULT NOW()
                    );
                """)
            conn.commit()
            print(f"[VectorStore] Schema ready (without ivfflat index: {e})")
        except Exception as e2:
            print(f"[VectorStore] Schema setup failed: {e2}")
    finally:
        conn.close()


def upsert_font_vector(
    font_id: int,
    font_name: str,
    font_family: str,
    geometry_vec: Optional[np.ndarray],
    clip_vec: Optional[np.ndarray],
    geometry_props: Optional[dict] = None,
):
    """
    Insert or update vectors for a single font.

    Also writes geometry properties back to the main `fonts` table so that:
      - Property filters (x_height, contrast, width) work for new fonts
      - Font-from-image geometry matching can find new fonts
      - serif_type is populated for category filtering
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            geo_str  = "[" + ",".join(f"{x:.6f}" for x in geometry_vec) + "]" if geometry_vec is not None else None
            clip_str = "[" + ",".join(f"{x:.6f}" for x in clip_vec)    + "]" if clip_vec is not None else None
            props_json = json.dumps(geometry_props, cls=_NumpyEncoder) if geometry_props else None

            # 1. Upsert into font_vectors table
            cur.execute("""
                INSERT INTO font_vectors (font_id, font_name, font_family, geometry_vec, clip_vec, geometry_props, indexed_at)
                VALUES (%s, %s, %s, %s::vector, %s::vector, %s::jsonb, NOW())
                ON CONFLICT (font_id) DO UPDATE SET
                    font_name      = EXCLUDED.font_name,
                    font_family    = EXCLUDED.font_family,
                    geometry_vec   = EXCLUDED.geometry_vec,
                    clip_vec       = EXCLUDED.clip_vec,
                    geometry_props = EXCLUDED.geometry_props,
                    indexed_at     = NOW()
            """, (font_id, font_name, font_family, geo_str, clip_str, props_json))

            # 2. Write geometry properties back to main fonts table
            # Only update fields that are currently NULL so manual overrides are preserved
            if geometry_props:
                x_height  = geometry_props.get("xHeight")    # "Low" | "Medium" | "High"
                contrast  = geometry_props.get("contrast")   # "Low" | "Medium" | "High"
                width     = geometry_props.get("width")      # "Normal" | "Condensed" | "Expanded"
                has_serif = geometry_props.get("hasSerif")   # bool
                weight    = geometry_props.get("weight")     # "Light" | "Regular" | "Bold"

                # Map serif detection to serifType
                serif_type = None
                if has_serif is True:
                    serif_type = "Serif"
                elif has_serif is False:
                    serif_type = "Sans-Serif"

                cur.execute("""
                    UPDATE fonts SET
                        x_height   = COALESCE(NULLIF(x_height, ''), %s),
                        contrast   = COALESCE(NULLIF(contrast, ''), %s),
                        width      = COALESCE(NULLIF(width, ''), %s),
                        weight     = COALESCE(NULLIF(weight, ''), %s),
                        serif_type = COALESCE(NULLIF(serif_type, ''), %s)
                    WHERE id = %s
                """, (x_height, contrast, width, weight, serif_type, font_id))

        conn.commit()
    finally:
        conn.close()


def search_by_clip(
    query_clip: np.ndarray,
    limit: int = 20,
) -> List[Dict]:
    """
    Find fonts by CLIP vector similarity (Phase 4).
    Uses pgvector cosine distance for fast ANN search.
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            vec_str = "[" + ",".join(f"{x:.6f}" for x in query_clip) + "]"
            
            cur.execute("""
                SELECT
                    font_id,
                    font_name,
                    font_family,
                    geometry_props,
                    1 - (clip_vec <=> %s::vector) AS clip_similarity
                FROM font_vectors
                WHERE clip_vec IS NOT NULL
                ORDER BY clip_vec <=> %s::vector
                LIMIT %s
            """, (vec_str, vec_str, limit))
            
            rows = cur.fetchall()
            return [
                {
                    "font_id":      row[0],
                    "font_name":    row[1],
                    "font_family":  row[2],
                    "geometry_props": row[3],
                    "clip_similarity": float(row[4]),
                }
                for row in rows
            ]
    finally:
        conn.close()


def search_by_geometry(
    query_geo: np.ndarray,
    limit: int = 20,
) -> List[Dict]:
    """
    Find fonts by geometry vector similarity (Phase 1).
    """
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            vec_str = "[" + ",".join(f"{x:.6f}" for x in query_geo) + "]"
            
            cur.execute("""
                SELECT
                    font_id,
                    font_name,
                    font_family,
                    geometry_props,
                    1 - (geometry_vec <=> %s::vector) AS geo_similarity
                FROM font_vectors
                WHERE geometry_vec IS NOT NULL
                ORDER BY geometry_vec <=> %s::vector
                LIMIT %s
            """, (vec_str, vec_str, limit))
            
            rows = cur.fetchall()
            return [
                {
                    "font_id":       row[0],
                    "font_name":     row[1],
                    "font_family":   row[2],
                    "geometry_props": row[3],
                    "geo_similarity": float(row[4]),
                }
                for row in rows
            ]
    finally:
        conn.close()


def search_fused(
    query_clip: Optional[np.ndarray],
    query_geo: Optional[np.ndarray],
    limit: int = 12,
    clip_weight: float = 0.65,
    geo_weight: float = 0.35,
) -> List[Dict]:
    """
    Fused search — combines CLIP + geometry scores.
    
    fusion_score = clip_similarity × 0.65 + geo_similarity × 0.35
    
    CLIP gets higher weight because it captures semantic similarity
    that geometry alone misses (Arial vs Helvetica, style families).
    Geometry anchors the result with measurable, deterministic properties.
    
    If only one vector type available, uses that alone.
    """
    clip_results = {}
    geo_results  = {}
    
    if query_clip is not None:
        for r in search_by_clip(query_clip, limit=limit * 2):
            clip_results[r["font_id"]] = r
    
    if query_geo is not None:
        for r in search_by_geometry(query_geo, limit=limit * 2):
            geo_results[r["font_id"]] = r
    
    # Merge all font IDs
    all_ids = set(clip_results.keys()) | set(geo_results.keys())
    
    fused = []
    for fid in all_ids:
        clip_r = clip_results.get(fid)
        geo_r  = geo_results.get(fid)
        
        clip_sim = clip_r["clip_similarity"] if clip_r else 0.0
        geo_sim  = geo_r["geo_similarity"]   if geo_r  else 0.0
        
        # Weight based on what's available
        if clip_r and geo_r:
            score = clip_sim * clip_weight + geo_sim * geo_weight
        elif clip_r:
            score = clip_sim
        else:
            score = geo_sim
        
        ref = clip_r or geo_r
        fused.append({
            "font_id":         fid,
            "font_name":       ref["font_name"],
            "font_family":     ref["font_family"],
            "geometry_props":  ref.get("geometry_props"),
            "clip_similarity": clip_sim,
            "geo_similarity":  geo_sim,
            "fused_score":     score,
            "match_pct":       int(score * 100),
        })
    
    fused.sort(key=lambda x: x["fused_score"], reverse=True)
    return fused[:limit]


def get_indexed_count() -> int:
    """How many fonts have been indexed."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM font_vectors WHERE clip_vec IS NOT NULL")
            return cur.fetchone()[0]
    except:
        return 0
    finally:
        conn.close()


def get_unindexed_fonts() -> List[Dict]:
    """Get fonts from the main fonts table that haven't been indexed yet."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT f.id, f.name, f.family, f.file_url
                FROM fonts f
                LEFT JOIN font_vectors fv ON f.id = fv.font_id
                WHERE fv.font_id IS NULL
                ORDER BY f.id
            """)
            rows = cur.fetchall()
            return [
                {"id": r[0], "name": r[1], "family": r[2], "file_url": r[3]}
                for r in rows
            ]
    finally:
        conn.close()


def get_all_fonts_for_indexing() -> List[Dict]:
    """Get all fonts from DB for full re-indexing."""
    conn = _get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name, family, file_url FROM fonts ORDER BY id")
            rows = cur.fetchall()
            return [
                {"id": r[0], "name": r[1], "family": r[2], "file_url": r[3]}
                for r in rows
            ]
    finally:
        conn.close()
