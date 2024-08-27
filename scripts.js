document.addEventListener('DOMContentLoaded', () => {
    populateModelDropdown();
});

async function populateModelDropdown() {
    const modelSelect = document.getElementById('model-select');
    const apiKey = document.getElementById('api-key').value.trim() || 'YOUR_DEFAULT_API_KEY'; // Use actual default or valid key

    try {
        const response = await fetch('https://api.siliconflow.cn/v1/models', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${apiKey}`
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

async function fetchRepoData() {
    const repoUrl = document.getElementById('repo-url').value.trim();
    const apiKey = document.getElementById('api-key').value.trim() || 'YOUR_DEFAULT_API_KEY'; // Use actual default or valid key
    const selectedModel = document.getElementById('model-select').value;

    if (!repoUrl) {
        alert('Please enter a repository URL');
        return;
    }

    try {
        const response = await fetch(`/api/analyze?repo=${encodeURIComponent(repoUrl)}&apiKey=${encodeURIComponent(apiKey)}&model=${encodeURIComponent(selectedModel)}`);
        const result = await response.text();
        document.getElementById('result').textContent = result;
    } catch (error) {
        console.error('Error fetching repo data:', error);
        document.getElementById('result').textContent = 'Error fetching repo data. Check console for details.';
    }
}
