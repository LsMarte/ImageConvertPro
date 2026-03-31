# 🚀 Deploy Backend to Render.com (Free)

## Step 1: Create Render Account
1. Go to https://render.com
2. Click **"Sign up"**
3. Choose **"GitHub"** to sign in with your GitHub account
4. Authorize Render to access your repositories

---

## Step 2: Deploy Your Repository

### Option A: Automatic Deploy (Recommended)
1. In Render dashboard, click **"New +"** → **"Web Service"**
2. Select **"Deploy an existing project from a Git repository"**
3. Click **"Configure account"** and authorize GitHub
4. Select your repository: **`ImageConvertPro`**
5. Fill in the form:
   - **Name:** `imageconvertpro` (or any name)
   - **Root Directory:** Leave empty
   - **Runtime:** `Node`
   - **Build Command:** `cd heic-converter && npm install`
   - **Start Command:** `cd heic-converter && npm start`
   - **Plan:** Choose **`Free`** (has some limitations but works great)
6. Click **"Create Web Service"**

### Option B: Manual Deploy (Enterprise GitHub)
If automatic deploy doesn't work, use the `render.yaml` file I created:
1. Render will detect `render.yaml` automatically
2. Just connect your repository and it'll deploy

---

## Step 3: Get Your Deployed URL

After deployment (takes 2-3 minutes):
1. In Render dashboard, you'll see your service
2. Look for the **URL** like: `https://imageconvertpro-xxxx.onrender.com`
3. **Copy this URL** - you'll need it next!

**Important:** 
- ✅ Your backend will be live at that URL
- ✅ It will auto-sleep after 15 min of inactivity (free tier)
- ✅ First request will wake it up (takes 30 seconds)
- ✅ Rebuilds with every GitHub push

---

## Step 4: Update Your Frontend

Once you have your deployed URL, **tell me the full URL** and I'll:
1. Update `script.js` to use your deployed backend
2. Push changes to GitHub
3. Your GitHub Pages site will work! ✅

---

## Example Deployed URL
```
https://imageconvertpro-abc123.onrender.com
```

Replace `abc123` with whatever Render generates.

---

## Troubleshooting

### Deploy Failed?
Check the **Logs** in Render:
1. Go to your service in Render
2. Click **"Logs"** tab
3. Look for error messages
4. Common issues:
   - Missing dependencies → Run `npm install`
   - Wrong start command → Check Node version
   - Port issues → Should auto-use 3000

### Slow First Load?
- Free tier goes to sleep after 15 minutes
- First request takes ~30 seconds to wake up
- That's normal! 🛌

### CORS Still Not Working?
- I added CORS to the backend ✅
- Make sure your deployed version has the latest code
- Trigger a redeploy: Push new commit to GitHub

---

## What to Do Now

1. **Go to https://render.com**
2. **Sign up with GitHub**
3. **Deploy the repository**
4. **Copy your deployed URL**
5. **Tell me the URL** (like: `https://imageconvertpro-xyz.onrender.com`)
6. I'll update your frontend! ✅

---

## After Deployment

Your app will work like this:
- 🌐 **GitHub Pages:** https://lsmarte.github.io/ImageConvertPro/
- 🔧 **Backend API:** https://imageconvertpro-xyz.onrender.com
- ✅ **Everything connected!**

---

**Let me know when you have your Render URL!** 🎉
