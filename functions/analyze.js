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
    const readmeContent = await fetchReadmeContent(repoPath);
    const repoStructure = await fetchRepoStructure(repoPath);
    const aiAnalysis = await performAIAnalysis(readmeContent, repoStructure, apiKey, model);

    return new Response(JSON.stringify({
      readmeContent,
      repoStructure,
      aiAnalysis
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function fetchReadmeContent(repoPath) {
  const response = await fetch(`https://api.github.com/repos/${repoPath}/contents/README.md`, {
    headers: { 'Accept': 'application/vnd.github.v3.raw' }
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch README: ${errorText}`);
  }
  return await response.text();
}

async function fetchRepoStructure(repoPath) {
  const response = await fetch(`https://api.github.com/repos/${repoPath}/git/trees/main?recursive=1`);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch repository structure: ${errorText}`);
  }
  const data = await response.json();
  return data.tree
    .filter(item => item.type === 'blob')
    .map(item => item.path);
}

async function performAIAnalysis(readmeContent, repoStructure, apiKey, model) {
  const prompt = `Analyze this GitHub repository:

README Content:
${readmeContent}

Repository Structure:
${repoStructure.join('\n')}

Provide a brief summary of the repository, its main features, and any notable aspects of its structure.`;

  const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI analysis failed: ${errorText}`);
  }

  const result = await response.json();
  return result.choices[0].message.content;
}
