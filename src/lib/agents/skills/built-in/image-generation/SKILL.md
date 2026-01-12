---
name: image-generation
description: Generate images using AI models based on text prompts. Use when user wants to create visuals, designs, illustrations, or artwork.
---

# Image Generation

## Purpose
Creates visual designs based on specific requirements. Used to generate new images from text descriptions.

## Guidelines
- Use English prompts unless specified otherwise
- Write detailed prompts including layout, color scheme, text content, position, size
- Do not include emojis or non-text content in prompts
- If user wants text in image, preserve exact user input

## Parameters

**Required:**
- `prompt`: Description of the image to generate
- `outputDir`: Directory path for output
- `outputName`: File name without extension

**Optional:**
- `aspectRatio`: Aspect ratio (e.g., "16:9", "1:1", "9:16"). Default: "1:1"
- `style`: Image style (e.g., "realistic", "illustration", "cartoon", "abstract")

## Execution

Use the `skill-runner` tool:
```json
{
  "skillName": "image-generation",
  "params": {
    "prompt": "A beautiful sunset over mountains with warm orange and purple colors",
    "aspectRatio": "16:9",
    "outputDir": "/images",
    "outputName": "sunset"
  }
}
```

### Product Image Example
```json
{
  "skillName": "image-generation",
  "params": {
    "prompt": "Professional product photo of a green smoothie in a glass bottle, white background, studio lighting",
    "aspectRatio": "1:1",
    "style": "realistic",
    "outputDir": "/products",
    "outputName": "smoothie-product"
  }
}
```

### Illustration Example
```json
{
  "skillName": "image-generation",
  "params": {
    "prompt": "Cute cartoon mascot character for a coffee brand, friendly expression, holding a coffee cup",
    "aspectRatio": "1:1",
    "style": "illustration",
    "outputDir": "/branding",
    "outputName": "mascot"
  }
}
```

## Output
Returns the path to the generated image file.
