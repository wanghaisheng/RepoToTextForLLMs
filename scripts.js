async function fetchRepoData() {
    const repoUrl = document.getElementById('repo-url').value;
    if (!repoUrl) {
        alert('Please enter a repository URL');
        return;
    }

    const response = await fetch(`/api/analyze?repo=${encodeURIComponent(repoUrl)}`);
    const result = await response.text();
    document.getElementById('result').textContent = result;
}
