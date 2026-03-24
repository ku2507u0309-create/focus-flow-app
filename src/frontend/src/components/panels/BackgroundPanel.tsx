import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, ImageIcon, Loader2, Palette, Save } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useGetUserSettings, useSetUserSettings } from "../../hooks/useQueries";
import { BackgroundType } from "../../hooks/useQueries";

const PRESET_COLORS = [
  "#0a0f1e",
  "#0d1117",
  "#0f0a1e",
  "#0a1e0f",
  "#1a0a0a",
  "#1a1a0a",
  "#0a0a1e",
  "#0e1020",
];

export default function BackgroundPanel() {
  const { data: settings, isLoading } = useGetUserSettings();
  const setSettings = useSetUserSettings();

  const [bgType, setBgType] = useState<"default" | "color" | "image">(
    settings?.backgroundType === BackgroundType.image ? "image" : 
    settings?.backgroundValue === "default" || !settings ? "default" : "color"
  );
  const [colorVal, setColorVal] = useState(
    settings?.backgroundType === BackgroundType.color
      ? settings.backgroundValue
      : "#0a0f1e",
  );
  const [imageUrl, setImageUrl] = useState(
    settings?.backgroundType === BackgroundType.image
      ? settings.backgroundValue
      : "",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  /**
   * Compresses an image file to a JPEG data URL within the ICP message size limit (~900KB).
   */
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (ev) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          // Scale down to max 1200px on longest side
          const MAX = 1200;
          let { width, height } = img;
          if (width > MAX || height > MAX) {
            if (width > height) {
              height = Math.round((height * MAX) / width);
              width = MAX;
            } else {
              width = Math.round((width * MAX) / height);
              height = MAX;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) return reject(new Error("Canvas not supported"));
          ctx.drawImage(img, 0, 0, width, height);

          // Try progressively lower quality until under 900KB
          const MAX_BYTES = 900 * 1024;
          let quality = 0.8;
          let dataUrl = canvas.toDataURL("image/jpeg", quality);
          while (dataUrl.length > MAX_BYTES && quality > 0.2) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL("image/jpeg", quality);
          }
          if (dataUrl.length > MAX_BYTES) {
            reject(
              new Error(
                "Image is too large even after compression. Please use a smaller image or choose a background color.",
              ),
            );
          } else {
            resolve(dataUrl);
          }
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadPct(10);

    try {
      setUploadPct(40);
      const dataUrl = await compressImage(file);
      setUploadPct(100);
      setImageUrl(dataUrl);
      setBgType("image");
      toast.success("Image ready!");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load image";
      toast.error(msg);
    } finally {
      setUploading(false);
      setUploadPct(0);
    }
  };

  const handleSave = async () => {
    try {
      if (bgType === "default") {
        await setSettings.mutateAsync({
          backgroundType: BackgroundType.color,
          backgroundValue: "default",
        });
        toast.success("Theme default applied!");
      } else if (bgType === "color") {
        await setSettings.mutateAsync({
          backgroundType: BackgroundType.color,
          backgroundValue: colorVal,
        });
        toast.success("Background saved!");
      } else {
        if (!imageUrl) {
          toast.error("No image selected");
          return;
        }
        // Check size -- ICP backend has ~1.9MB message limit, stay well under
        const sizeKB = Math.round((imageUrl.length * 3) / 4 / 1024);
        if (sizeKB > 900) {
          toast.error(
            `Image is still too large (${sizeKB}KB). Please use a smaller image or choose a background color.`,
          );
          return;
        }
        await setSettings.mutateAsync({
          backgroundType: BackgroundType.image,
          backgroundValue: imageUrl,
        });
        toast.success("Background saved!");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (
        msg.includes("size") ||
        msg.includes("large") ||
        msg.includes("limit")
      ) {
        toast.error(
          "Image too large for storage. Try a smaller image or use a background color.",
        );
      } else {
        toast.error("Failed to save background. Please try again.");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="glass-card-strong p-5">
        <p className="section-overline mb-1">Appearance</p>
        <h2 className="section-title">Background</h2>
      </div>

      {/* Type toggle */}
      <div className="glass-card p-4">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBgType("default")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              bgType === "default"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border/30 text-muted-foreground hover:border-border/50"
            }`}
          >
            <Palette className="w-4 h-4" />
            Default
          </button>
          <button
            type="button"
            onClick={() => setBgType("color")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              bgType === "color"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border/30 text-muted-foreground hover:border-border/50"
            }`}
          >
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-400 to-blue-400" />
            Color
          </button>
          <button
            type="button"
            onClick={() => setBgType("image")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${
              bgType === "image"
                ? "bg-primary/15 border-primary/40 text-primary"
                : "border-border/30 text-muted-foreground hover:border-border/50"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>
      </div>

      {bgType === "default" && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5 text-center">
          <p className="text-sm text-foreground font-medium mb-1">Theme Default</p>
          <p className="text-xs text-muted-foreground">This uses the gorgeous animated background from your selected Light or Dark theme.</p>
        </motion.div>
      )}

      {bgType === "color" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-5 space-y-4"
        >
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Custom Color
            </Label>
            <div className="flex items-center gap-3">
              <input
                data-ocid="background.color_input"
                type="color"
                value={colorVal}
                onChange={(e) => setColorVal(e.target.value)}
                className="w-12 h-10 rounded-lg border border-border/40 cursor-pointer bg-transparent"
              />
              <span className="text-sm text-foreground font-mono">
                {colorVal}
              </span>
              <div
                className="flex-1 h-10 rounded-xl border border-border/30"
                style={{ background: colorVal }}
              />
            </div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Presets</p>
            <div className="grid grid-cols-8 gap-1.5">
              {PRESET_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColorVal(c)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all ${
                    colorVal === c
                      ? "border-primary scale-110"
                      : "border-transparent hover:border-border/50"
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {bgType === "image" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-card p-5 space-y-4"
        >
          {imageUrl && (
            <div
              className="w-full h-32 rounded-xl border border-border/30 bg-cover bg-center"
              style={{ backgroundImage: `url(${imageUrl})` }}
            />
          )}

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Upload Image
            </Label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              data-ocid="background.upload_button"
              type="button"
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-border/40 text-muted-foreground hover:text-foreground"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading {uploadPct}%...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Choose Image
                </>
              )}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Save button */}
      <Button
        data-ocid="background.save_button"
        onClick={handleSave}
        disabled={setSettings.isPending || uploading}
        className="w-full btn-premium h-11"
      >
        {setSettings.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : setSettings.isSuccess ? (
          <Check className="w-4 h-4 mr-2" />
        ) : (
          <Save className="w-4 h-4 mr-2" />
        )}
        {setSettings.isPending ? "Saving..." : "Apply Background"}
      </Button>

      {settings && (
        <div className="glass-card p-3 text-xs text-muted-foreground">
          <span className="font-medium">Current: </span>
          {settings.backgroundType === BackgroundType.color
            ? `Color — ${settings.backgroundValue}`
            : "Custom image"}
        </div>
      )}
    </div>
  );
}
