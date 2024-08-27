
// functions/api/github-analyzer.js

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const repoUrl = url.searchParams.get('repo');
  const apiKey = url.searchParams.get('apiKey') || env.DEFAULT_API_KEY;
  const model = url.searchParams.get('model') || 'deepseek-ai/DeepSeek-V2-Chat';
  console.log('Received request with parameters:', { repoUrl, apiKey, model });

  if (!repoUrl) {
    return new Response('Please provide a repo URL as a query parameter, e.g., ?repo=owner/repo', { status: 400 });
  }

  const repoName = repoUrl.replace('https://github.com/', '');
  const [owner, repo] = repoName.split('/');
  const repoPath = `${owner}/${repo}`;

  try {
    const readmeContent = await fetchFromGitHub(`https://api.github.com/repos/${repoPath}/contents/README.md`);
    const repoStructure = await traverseRepoIteratively(repoPath);
    const fileContents = await getFileContentsIteratively(repoPath);

    const instructions = `
    Prompt: Analyze the ${repoName} repository to understand its structure, purpose, and functionality. Follow these steps to study the codebase:
    ...
    README:
    ${readmeContent}
    Repository Structure:
    ${repoStructure}
    File Contents:
    ${fileContents}
    `;

    const apiResponse = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: instructions }],
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
    console.log('External API response received:', apiResult);
    
    return new Response(JSON.stringify(apiResult), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(`Error: ${error.message}`, { status: 500 });
  }
}

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
    // List of binary file extensions...
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
