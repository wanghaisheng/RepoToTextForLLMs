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
            
            // Post instructions to the external API
            const apiResponse = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer sk-nuibibsphocjpyqytwtqkvxzqyfypauaqhimfyekiktenlah',
                },
                body: JSON.stringify({
                    model: 'deepseek-ai/DeepSeek-V2-Chat',
                    messages: [
                        { role: 'user', content: instructions }
                    ],
                    stream: false,
                    max_tokens: 512,
                    temperature: 0.7,
                    top_p: 0.7,
                    top_k: 50,
                    frequency_penalty: 0.5,
                    n: 1
                })
            });

            if (!apiResponse.ok) {
                throw new Error(`API request failed with status ${apiResponse.status}`);
            }

            const apiResult = await apiResponse.json();

            // Return the API result
            return new Response(JSON.stringify(apiResult), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } catch (error) {
            return new Response(`Error: ${error.message}`, { status: 500 });
        }
    }
};

// Helper functions used in this code
async function fetchFromGitHub(url) {
    const response = await fetch(url, {
        headers: {
            'Accept': 'application/vnd.github.v3+json',
        },
    });
    if (!response.ok) {
        throw new Error(`GitHub API request failed with status ${response.status}`);
    }
    return response.json();
}

async function traverseRepoIteratively(repo) {
    let structure = "";
    const dirsToVisit = [{ path: "", url: `https://api.github.com/repos/${repo}/contents` }];
    const dirsVisited = new Set();

    while (dirsToVisit.length > 0) {
        const { path, url } = dirsToVisit.pop();
        dirsVisited.add(path);
        const contents = await fetchFromGitHub(url);

        for (const content of contents) {
            if (content.type === "dir") {
                if (!dirsVisited.has(content.path)) {
                    structure += `${path}/${content.name}/\n`;
                    dirsToVisit.push({ path: `${path}/${content.name}`, url: content.url });
                }
            } else {
                structure += `${path}/${content.name}\n`;
            }
        }
    }
    return structure;
}

async function getFileContentsIteratively(repo) {
    let fileContents = "";
    const dirsToVisit = [{ path: "", url: `https://api.github.com/repos/${repo}/contents` }];
    const dirsVisited = new Set();
    const binaryExtensions = [
        '.exe', '.dll', '.so', '.a', '.lib', '.dylib', '.o', '.obj',
        '.zip', '.tar', '.tar.gz', '.tgz', '.rar', '.7z', '.bz2', '.gz', '.xz', '.z', '.lz', '.lzma', '.lzo', '.rz', '.sz', '.dz',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt', '.ods', '.odp',
        '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.mp4', '.wav', '.flac', '.ogg', '.avi', '.mkv', '.mov', '.webm', '.wmv', '.m4a', '.aac',
        '.iso', '.vmdk', '.qcow2', '.vdi', '.vhd', '.vhdx', '.ova', '.ovf',
        '.db', '.sqlite', '.mdb', '.accdb', '.frm', '.ibd', '.dbf',
        '.jar', '.class', '.war', '.ear', '.jpi',
        '.pyc', '.pyo', '.pyd', '.egg', '.whl',
        '.deb', '.rpm', '.apk', '.msi', '.dmg', '.pkg', '.bin', '.dat', '.data',
        '.dump', '.img', '.toast', '.vcd', '.crx', '.xpi', '.lockb', 'package-lock.json', '.svg',
        '.eot', '.otf', '.ttf', '.woff', '.woff2',
        '.ico', '.icns', '.cur',
        '.cab', '.dmp', '.msp', '.msm',
        '.keystore', '.jks', '.truststore', '.cer', '.crt', '.der', '.p7b', '.p7c', '.p12', '.pfx', '.pem', '.csr',
        '.key', '.pub', '.sig', '.pgp', '.gpg',
        '.nupkg', '.snupkg', '.appx', '.msix', '.msp', '.msu',
        '.deb', '.rpm', '.snap', '.flatpak', '.appimage',
        '.ko', '.sys', '.elf',
        '.swf', '.fla', '.swc',
        '.rlib', '.pdb', '.idb', '.pdb', '.dbg',
        '.sdf', '.bak', '.tmp', '.temp', '.log', '.tlog', '.ilk',
        '.bpl', '.dcu', '.dcp', '.dcpil', '.drc',
        '.aps', '.res', '.rsrc', '.rc', '.resx',
        '.prefs', '.properties', '.ini', '.cfg', '.config', '.conf',
        '.DS_Store', '.localized', '.svn', '.git', '.gitignore', '.gitkeep',
    ];

    while (dirsToVisit.length > 0) {
        const { path, url } = dirsToVisit.pop();
        dirsVisited.add(path);
        const contents = await fetchFromGitHub(url);

        for (const content of contents) {
            if (content.type === "dir") {
                if (!dirsVisited.has(content.path)) {
                    dirsToVisit.push({ path: `${path}/${content.name}`, url: content.url });
                }
            } else {
                const fileExtension = content.name.split('.').pop();
                if (binaryExtensions.includes(`.${fileExtension}`)) {
                    fileContents += `File: ${path}/${content.name}\nContent: Skipped binary file\n\n`;
                } else {
                    fileContents += `File: ${path}/${content.name}\n`;
                    try {
                        const fileContent = await fetchFromGitHub(content.download_url);
                        fileContents += `Content:\n${await fileContent.text()}\n\n`;
                    } catch (error) {
                        fileContents += `Content: Skipped due to decoding error\n\n`;
                    }
                }
            }
        }
    }
    return fileContents;
}
