async function populateModelDropdown() {
    const modelSelect = document.getElementById('model-select');
    const apiKeyInput = document.getElementById('api-key');
    const apiKey = apiKeyInput.value.trim();

    // Debugging: Check the API key value
    console.log('API Key from input:', apiKey);

    // Use a default API key if none is provided
    const usedApiKey = apiKey || 'YOUR_DEFAULT_API_KEY';
    console.log('Using API Key:', usedApiKey);

    try {
        const response = await fetch('https://api.siliconflow.cn/v1/models', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${usedApiKey}`
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const models = data.data;

        // Clear previous options
        modelSelect.innerHTML = '';

        if (models.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No models available';
            modelSelect.appendChild(option);
        } else {
            models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.id;
                option.textContent = model.id;
                modelSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error fetching models:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Error loading models';
        modelSelect.appendChild(option);
    }
}
