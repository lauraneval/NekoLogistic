import type { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";

/**
 * Create an image element from a URL
 */
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // needed to avoid cross-origin issues on CodeSandbox
    image.src = url;
  });

/**
 * Get cropped image as a Blob
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  rotation = 0
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return null;
  }

  // Set canvas size to match the bounding box of the rotated image
  const rotRad = (rotation * Math.PI) / 180;
  const { width: bWidth, height: bHeight } = {
    width: Math.abs(Math.cos(rotRad) * image.width) + Math.abs(Math.sin(rotRad) * image.height),
    height: Math.abs(Math.sin(rotRad) * image.width) + Math.abs(Math.cos(rotRad) * image.height),
  };

  canvas.width = bWidth;
  canvas.height = bHeight;

  // translate canvas context to a central point and draw image
  ctx.translate(bWidth / 2, bHeight / 2);
  ctx.rotate(rotRad);
  ctx.translate(-image.width / 2, -image.height / 2);

  // draw rotated image
  ctx.drawImage(image, 0, 0);

  // croppedAreaPixels values are relative to the bounding box of the rotated image
  const data = ctx.getImageData(
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height
  );

  // set canvas width to final desired crop size
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  // paste generated rotate image with correct offsets for x,y crop values.
  ctx.putImageData(data, 0, 0);

  // As a Blob
  return new Promise((resolve) => {
    canvas.toBlob((file) => {
      resolve(file);
    }, "image/jpeg");
  });
}

/**
 * Compress image blob
 */
export async function compressImage(imageBlob: Blob): Promise<File> {
  const options = {
    maxSizeMB: 0.2, // 200KB
    maxWidthOrHeight: 800, // 800px max
    useWebWorker: true,
  };
  
  const compressedBlob = await imageCompression(imageBlob as File, options);
  return new File([compressedBlob], "avatar.jpg", { type: "image/jpeg" });
}
