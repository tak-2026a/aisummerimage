document.addEventListener('DOMContentLoaded', () => {
    // State
    let apiKey = localStorage.getItem('gemini_api_key') || '';
    let currentImageBase64 = null;
    let currentImageMimeType = null;
    let backgroundBase64 = null;
    let backgroundMimeType = 'image/jpeg';
    let mediaStream = null;

    // Fetch background image
    fetch('summer.jpg')
        .then(res => res.blob())
        .then(blob => {
            const reader = new FileReader();
            reader.onload = (e) => {
                backgroundBase64 = e.target.result.split(',')[1];
            };
            reader.readAsDataURL(blob);
        })
        .catch(err => console.error('Failed to load summer.jpg:', err));

    // DOM Elements
    const apiKeyInput = document.getElementById('api-key');
    const btnLogin = document.getElementById('btn-login');
    
    const optionCamera = document.getElementById('option-camera');
    const optionUpload = document.getElementById('option-upload');
    const fileUpload = document.getElementById('file-upload');
    const cameraContainer = document.getElementById('camera-container');
    const video = document.getElementById('video');
    const btnCapture = document.getElementById('btn-capture');
    
    const imagePreview = document.getElementById('image-preview');
    const btnGenerate = document.getElementById('btn-generate');
    
    const imageResult = document.getElementById('image-result');
    const btnDownload = document.getElementById('btn-download');
    const btnRestart = document.getElementById('btn-restart');

    // Navigation
    function showStep(stepId) {
        document.querySelectorAll('.step').forEach(step => {
            step.classList.remove('active');
            step.classList.add('hidden');
        });
        document.getElementById(stepId).classList.remove('hidden');
        // Small delay for animation
        setTimeout(() => {
            document.getElementById(stepId).classList.add('active');
        }, 50);
    }

    // Init Login
    if (apiKey) {
        apiKeyInput.value = apiKey;
    }

    btnLogin.addEventListener('click', () => {
        if (apiKeyInput.value.trim()) {
            apiKey = apiKeyInput.value.trim();
            localStorage.setItem('gemini_api_key', apiKey);
            showStep('step-capture');
        } else {
            alert('Please enter a valid API Key');
        }
    });

    // Camera Capture
    optionCamera.addEventListener('click', async () => {
        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = mediaStream;
            cameraContainer.classList.remove('hidden');
            document.querySelector('.image-options').style.display = 'none';
        } catch (err) {
            console.error('Error accessing camera:', err);
            alert('Could not access camera. Please ensure permissions are granted.');
        }
    });

    btnCapture.addEventListener('click', () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        currentImageBase64 = dataUrl.split(',')[1];
        currentImageMimeType = 'image/jpeg';
        
        imagePreview.src = dataUrl;
        
        // Stop camera
        if (mediaStream) {
            mediaStream.getTracks().forEach(track => track.stop());
        }
        
        showStep('step-prompt');
    });

    // File Upload
    optionUpload.addEventListener('click', () => {
        fileUpload.click();
    });

    fileUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const dataUrl = event.target.result;
                currentImageBase64 = dataUrl.split(',')[1];
                currentImageMimeType = file.type;
                imagePreview.src = dataUrl;
                showStep('step-prompt');
            };
            reader.readAsDataURL(file);
        }
    });

    // Generation
    btnGenerate.addEventListener('click', async () => {
        if (!backgroundBase64) {
            alert('Background image is still loading, please wait a moment.');
            return;
        }

        showStep('step-loading');

        try {
            const resultUrl = await generateImageWithGemini(currentImageBase64, currentImageMimeType, backgroundBase64, backgroundMimeType);
            
            // Preload the image to ensure it's fully downloaded before showing
            // We use native Image loading instead of fetch to avoid Cloudflare blocking JS fetch requests
            const imgLoad = new Image();
            imgLoad.onload = () => {
                imageResult.src = resultUrl;
                showStep('step-result');
            };
            imgLoad.onerror = () => {
                console.error('Failed to load image from URL:', resultUrl);
                alert('Error: The image generation service failed to return an image (possibly blocked). Please try again.');
                showStep('step-prompt');
            };
            imgLoad.src = resultUrl;
        } catch (err) {
            console.error('Generation Error:', err);
            alert('Error generating image: ' + err.message);
            showStep('step-prompt');
        }
    });

    async function generateImageWithGemini(userImageBase64, userMimeType, bgBase64, bgMimeType) {
        // Fallback strategy: since most Gemini API keys (like gemini-1.5-pro or flash) 
        // return text, we use Gemini to create a highly detailed prompt based on the user's images.
        
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [
                    { text: `Analyze these two images. The first is a user's photo, and the second is a summer background scene. Write a highly detailed prompt IN ENGLISH for an AI image generator to composite the user naturally and beautifully into the summer background scene perfectly. MAXIMUM 40 words. Just output the English prompt, nothing else.` },
                    {
                        inline_data: {
                            mime_type: userMimeType,
                            data: userImageBase64
                        }
                    },
                    {
                        inline_data: {
                            mime_type: bgMimeType,
                            data: bgBase64
                        }
                    }
                ]
            }]
        };

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        let generatedPrompt = data.candidates[0].content.parts[0].text.trim();
        
        // Clean up the prompt (remove markdown, newlines, etc. that might break the URL)
        generatedPrompt = generatedPrompt.replace(/```/g, '').replace(/\n/g, ' ').trim();
        console.log("Generated AI Prompt:", generatedPrompt);
        
        // Pass the highly detailed prompt to Pollinations AI for image generation
        // Add a random seed to ensure a fresh image each time
        const seed = Math.floor(Math.random() * 1000000);
        // Limit prompt length string to prevent URL 414 Too Long errors
        const encodedPrompt = encodeURIComponent(generatedPrompt.substring(0, 300));
        const imgUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=800&height=800&nologo=true&seed=${seed}`;
        
        console.log("Image URL generated:", imgUrl);
        return imgUrl;
    }

    // Download & Restart
    btnDownload.addEventListener('click', async () => {
        try {
            const response = await fetch(imageResult.src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ai-magic-image.jpg';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (err) {
            // Fallback for CORS issues
            const a = document.createElement('a');
            a.href = imageResult.src;
            a.download = 'ai-magic-image.jpg';
            a.target = '_blank';
            a.click();
        }
    });

    btnRestart.addEventListener('click', () => {
        currentImageBase64 = null;
        imagePreview.src = '';
        imageResult.src = '';
        cameraContainer.classList.add('hidden');
        document.querySelector('.image-options').style.display = 'flex';
        showStep('step-capture');
    });
});
