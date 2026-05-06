# AI Image Combiner 🎨✨

A purely static, lightning-fast web application that allows you to composite your own photo onto a beautiful summer background using the **Gemini 2.5 Flash API** and AI image generation.

## Features
- **Zero Backend Required:** 100% Vanilla HTML, CSS, and JavaScript. Perfect for free static hosting like GitHub Pages!
- **WebRTC Camera:** Take a selfie directly from your webcam.
- **File Upload:** Upload an existing photo from your computer or phone.
- **Dual-Image Synthesis:** Sends both your photo and a preset `summer.jpg` background to the Gemini API.
- **Smart Prompt Generation:** Uses Gemini to analyze both images and generate a highly detailed, optimized prompt in English.
- **Free Image Generation:** Automatically renders the final image using the Pollinations AI service.
- **Glassmorphism UI:** Modern, responsive, and beautiful user interface.

## How to Deploy to GitHub Pages

Since this project requires no build tools (like Node.js or Webpack), deploying it is incredibly simple:

1. Create a new public repository on your GitHub account.
2. Upload the following files to your new repository:
   - `index.html`
   - `style.css`
   - `app.js`
   - `summer.jpg`
   - `README.md`
3. In your GitHub repository, go to **Settings** > **Pages**.
4. Under "Build and deployment", set the **Source** to `Deploy from a branch`.
5. Select the `main` (or `master`) branch and click **Save**.
6. Wait 1-2 minutes, and your live URL will appear at the top of the Pages settings!

## How to Use

1. Go to your live GitHub Pages URL.
2. Enter your **Google Gemini API Key** (Get one for free at [Google AI Studio](https://aistudio.google.com/)).
3. Snap a photo or upload one.
4. (Optional) Customize the prompt to specify how you want to be blended into the summer background.
5. Click **Combine & Generate ✨** and enjoy the magic!

## Tech Stack
- HTML5
- CSS3 (Vanilla)
- JavaScript (ES6+)
- Gemini API (generativelanguage.googleapis.com)
