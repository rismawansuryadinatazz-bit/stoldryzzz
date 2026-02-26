<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1SAOM5UE-1TSGmfIv5tJiWq5_Ev0rSTuy

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deployment (Netlify / Vercel)

1. **Build the app:**
   `npm run build`
2. **Deploy the `dist` folder:**
   - If using **Netlify Drag & Drop**: Upload **ONLY** the contents of the `dist` folder.
   - If using **GitHub Integration**: Set the build command to `npm run build` and the publish directory to `dist`.

**Note:** Configuration files (`netlify.toml`, `_redirects`) are already included to handle routing and prevent 404 errors.
