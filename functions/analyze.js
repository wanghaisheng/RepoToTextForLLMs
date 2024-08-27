export default {
    async fetch(request) {
        const url = new URL(request.url);
        const repoUrl = url.searchParams.get('repo');
        
        if (!repoUrl) {
            return new Response('Please provide a repo URL as a query parameter, e.g., ?repo=owner/repo', { status: 400 });
        }

        const repoName = repoUrl.replace('https://github.com/', '');
        const [owner, repo] = repoName.split('/');
        const repoPath = `${owner}/${repo}`;

        // Fetch README, repo structure, and file contents
        try {
            const readmeContent = await fetchFromGitHub(`https://api.github.com/repos/${repoPath}/contents/README.md`);
            const repoStructure = await traverseRepoIteratively(repoPath);
            const fileContents = await getFileContentsIteratively(repoPath);

            const instructions = `
            Prompt: Analyze the ${repoName} repository to understand its structure, purpose, and functionality. Follow these steps to study the codebase:

            1. Read the README file to gain an overview of the project, its goals, and any setup instructions.

            2. Examine the repository structure to understand how the files and directories are organized.

            3. Identify the main entry point of the application (e.g., main.py, app.py, index.js) and start analyzing the code flow from there.

            4. Study the dependencies and libraries used in the project to understand the external tools and frameworks being utilized.

            5. Analyze the core functionality of the project by examining the key modules, classes, and functions.

            6. Look for any configuration files (e.g., config.py, .env) to understand how the project is configured and what settings are available.

            7. Investigate any tests or test directories to see how the project ensures code quality and handles different scenarios.

            8. Review any documentation or inline comments to gather insights into the codebase and its intended behavior.

            9. Identify any potential areas for improvement, optimization, or further exploration based on your analysis.

            10. Provide a summary of your findings, including the project's purpose, key features, and any notable observations or recommendations.

            Use the files and contents provided below to complete this analysis:

            README:
            ${readmeContent}

            Repository Structure:
            ${repoStructure}

            File Contents:
            ${fileContents}
            `;
            
            return new Response(instructions, { status: 200, headers: { 'Content-Type': 'text/plain' } });
        } catch (error) {
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    }
};
