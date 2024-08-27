document.addEventListener('DOMContentLoaded', () => {
    populateModelDropdown();
});

async function populateModelDropdown() {
    const modelSelect = document.getElementById('model-select');
    try {
        const response = await fetch('https://api.siliconflow.cn/v1/models', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer YOUR_API_KEY' // Replace with your default API key or handle this securely
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }

        const data = await response.json();
        const models = data.data;

        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model.id;
            option.textContent = model.id;
            modelSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Error fetching models:', error);
    }
}

async function fetchRepoData() {
    const repoUrl = document.getElementById('repo-url').value;
    const apiKey = document.getElementById('api-key').value || 'YOUR_DEFAULT_API_KEY';
    const selectedModel = document.getElementById('model-select').value;
    
    if (!repoUrl) {
        alert('Please enter a repository URL');
        return;
    }

    const response = await fetch(`/api/analyze?repo=${encodeURIComponent(repoUrl)}&apiKey=${encodeURIComponent(apiKey)}&model=${encodeURIComponent(selectedModel)}`);
    const result = await response.text();
    document.getElementById('result').textContent = result;
}
