import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Upload } from "lucide-react";

const USAGE_TAGS = ["Display", "Paragraph", "UI", "Branding"];
const MOOD_TAGS = ["Modern", "Classic", "Playful", "Formal", "Geometric"];

export default function UploadPage() {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      designerName: "",
      license: "OFL",
      donationLink: "",
      usageTags: [],
      moodTags: [],
    }
  });

  const { data: taxonomy } = useQuery<any>({ queryKey: ["/api/taxonomy"] });
  const [selectedStyles, setSelectedStyles] = useState<number[]>([]);

  const onSubmit = async (data: any) => {
    const fileInput = document.getElementById('font-files') as HTMLInputElement;
    if (!fileInput?.files?.length) {
      toast({ title: "No files selected", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    for (let i = 0; i < fileInput.files.length; i++) {
      formData.append('fonts', fileInput.files[i]);
    }
    formData.append('designerName', data.designerName);
    formData.append('license', data.license);
    formData.append('donationLink', data.donationLink);
    formData.append('usageTags', JSON.stringify(data.usageTags));
    formData.append('moodTags', JSON.stringify(data.moodTags));
    formData.append('selectedStyles', JSON.stringify(selectedStyles));

    try {
      const res = await fetch('/api/fonts/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      toast({ title: "Fonts uploaded successfully" });
      form.reset();
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 max-w-2xl">
      <Card className="rounded-3xl shadow-xl border-border/40">
        <CardHeader>
          <CardTitle className="text-2xl font-black uppercase tracking-widest text-primary">Upload New Font Family</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="space-y-2">
                <FormLabel>Font Files (.ttf, .otf, .woff, .woff2, .zip)</FormLabel>
                <Input id="font-files" type="file" multiple className="rounded-xl" />
              </div>

              <FormField
                control={form.control}
                name="designerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designer Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter designer name..." {...field} className="rounded-xl" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="license"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Select license" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Personal">Personal Use</SelectItem>
                          <SelectItem value="OFL">SIL OFL</SelectItem>
                          <SelectItem value="GPL">GNU GPL</SelectItem>
                          <SelectItem value="Apache">Apache 2.0</SelectItem>
                          <SelectItem value="Custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="donationLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Donation Link</FormLabel>
                      <FormControl>
                        <Input placeholder="https://..." {...field} className="rounded-xl" />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <FormLabel>Style Assignments</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {taxonomy?.categories.map((cat: any) => (
                    <div key={cat.id} className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-primary/40">{cat.name}</p>
                      <div className="space-y-1">
                        {taxonomy.styles.filter((s: any) => s.categoryId === cat.id).map((style: any) => (
                          <div key={style.id} className="flex items-center space-x-2">
                            <Checkbox 
                              checked={selectedStyles.includes(style.id)}
                              onCheckedChange={(checked) => {
                                setSelectedStyles(prev => checked 
                                  ? [...prev, style.id]
                                  : prev.filter(id => id !== style.id)
                                );
                              }}
                            />
                            <span className="text-sm">{style.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <FormLabel>Usage Tags</FormLabel>
                <div className="grid grid-cols-2 gap-2">
                  {USAGE_TAGS.map(tag => (
                    <FormField
                      key={tag}
                      control={form.control}
                      name="usageTags"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox 
                              checked={field.value.includes(tag)}
                              onCheckedChange={(checked) => {
                                field.onChange(checked 
                                  ? [...field.value, tag]
                                  : field.value.filter((t: string) => t !== tag)
                                );
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-medium">{tag}</FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full rounded-2xl h-12 font-bold uppercase tracking-widest" disabled={isUploading}>
                {isUploading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Upload className="h-5 w-5 mr-2" />}
                Ingest Font Family
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
