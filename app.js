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
        // Step 1: Send both images to Gemini to generate a fun vacation caption.
        // Since Gemini 2.5 Flash cannot output image pixels, we use it for text/vision intelligence.
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const requestBody = {
            contents: [{
                parts: [
                    { text: `Analyze these two images (a user's portrait and a summer scene). Write a very short, fun, summer vacation caption (maximum 4 words) in English. For example: "Summer Vibes!", "Beach Day!", or "Hello Sunshine!". Output ONLY the caption, no quotes, no markdown.` },
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errBody = await response.json();
            throw new Error(errBody.error?.message || 'Gemini API request failed');
        }

        const data = await response.json();
        let generatedCaption = data.candidates[0]?.content?.parts[0]?.text || 'Summer Vibes!';
        generatedCaption = generatedCaption.replace(/["']/g, '').replace(/\n/g, ' ').trim();
        console.log("Gemini Generated Caption:", generatedCaption);

        // Step 2: Manually composite the user's face and the Gemini caption onto the summer background using HTML5 Canvas!
        return new Promise((resolve, reject) => {
            const bgImg = new Image();
            bgImg.onload = () => {
                const userImg = new Image();
                userImg.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = bgImg.width;
                    canvas.height = bgImg.height;
                    const ctx = canvas.getContext('2d');
                    
                    // Draw background
                    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                    
                    // Calculate position for user image (bottom right)
                    const targetHeight = canvas.height * 0.45; // User takes 45% of height
                    const ratio = targetHeight / userImg.height;
                    const targetWidth = userImg.width * ratio;
                    const x = canvas.width - targetWidth - 40;
                    const y = canvas.height - targetHeight - 40;
                    
                    // Create a circular clipping path for soft edge blending
                    ctx.save();
                    ctx.beginPath();
                    // Draw an ellipse
                    ctx.ellipse(
                        x + targetWidth / 2, 
                        y + targetHeight / 2, 
                        targetWidth / 2, 
                        targetHeight / 2, 
                        0, 0, Math.PI * 2
                    );
                    ctx.closePath();
                    
                    // Add a glowing shadow to make it pop
                    ctx.shadowColor = 'rgba(255, 255, 255, 0.8)';
                    ctx.shadowBlur = 20;
                    ctx.fill(); // fill to create the shadow
                    
                    ctx.clip(); // clip the image to the ellipse
                    ctx.drawImage(userImg, x, y, targetWidth, targetHeight);
                    ctx.restore();
                    
                    // Write the Gemini generated caption on the image!
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 80px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    ctx.shadowBlur = 15;
                    ctx.shadowOffsetX = 3;
                    ctx.shadowOffsetY = 3;
                    ctx.fillText(generatedCaption, canvas.width / 2, canvas.height * 0.2);
                    
                    // Return the final composited image as a Blob URL
                    canvas.toBlob((blob) => {
                        resolve(URL.createObjectURL(blob));
                    }, 'image/jpeg', 0.9);
                };
                userImg.onerror = () => reject(new Error('Failed to load user image onto canvas.'));
                userImg.src = 'data:' + userMimeType + ';base64,' + userImageBase64;
            };
            bgImg.onerror = () => reject(new Error('Failed to load background image onto canvas.'));
            bgImg.src = 'data:' + bgMimeType + ';base64,' + bgBase64;
        });
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
