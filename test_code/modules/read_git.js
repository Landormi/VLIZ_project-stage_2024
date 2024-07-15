// import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";
// import { parse, stringify } from "https://cdn.skypack.dev/yaml";
import { Octokit } from "octokit";
import { parse, stringify } from "yaml";



// const cacheList = new NodeCache();
//--------------------------Test const-------------------------------//
const tocken = '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'
const owner = "Landormi";
const repo = "VLIZ_project-stage_2024";
const path = "P06";


//-------------------------------------------------------------------//

let nbrequest = 0;


//-------------------------------------------------------------------//

async function listFilesInDirectory(owner, repo, directoryPath, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: directoryPath
        });
        nbrequest ++;

        if (Array.isArray(response.data)) {
            const files = response.data.filter(item => item.type === 'file' && item.name.endsWith('.yml'));
            // console.log(response.data[1]);
            return files;
        } else {
            console.error('Failed to list files:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error listing files:', error.message);
        return [];
    }
}

async function fetchFileContent(owner, repo, filePath, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: filePath
        });
        nbrequest ++;
        
        if (response.status === 200) {
            const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
            return {content, sha: response.data.sha};
        } else {
            console.error('Failed to retrieve file:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error fetching file:', error.message);
        return null;
    }
}

function updateTranslations(yamlContents, translations, language) {
    const contentObj = parse(yamlContents.content);
    // console.log(contentObj)

    contentObj.labels.forEach(label => {
        const translationKey = label.name;
        if (translations.hasOwnProperty(translationKey)) {
            const translationObj = label.translations.find(t => t.hasOwnProperty(language));
            if (translationObj) {
                translationObj[language] = translations[translationKey];
            }else{
                console.error("there is no " + language + " in the translation proposal ")
            }
        }
    });
    // console.log(contentObj)

    yamlContents.content = stringify(contentObj);
    return yamlContents;
}

async function putFile(updatedYamlContents, filePath, octokit){
    try{
        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: filePath,
            message: 'Update translations for YAML file',
            content: Buffer.from(updatedYamlContents.content).toString('base64'),
            sha: updatedYamlContents.sha
        });
        nbrequest ++;
        console.log('YAML file updated successfully:', response.status);
    } catch (error) {
        console.error('Error modifying YAML file:', error.message);
    }
}

async function findBranch(owner, repo, branchName, octokit) {
    try {
        const branchResponse = await octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{branch}', {
            owner,
            repo,
            branch: branchName
        });
        nbrequest++;
        const branchSha = branchResponse.data.object.sha;
        return 

    } catch (error) {
        console.error('Error creating branch:', error.message);

        if (error.response) {
            console.error('Error details:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}

async function createBranch(owner, repo, branchName, sourceBranch, octokit) {
    try {
        const sourceBranchResponse = await octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{branch}', {
            owner,
            repo,
            branch: sourceBranch
        });
        nbrequest++;
        const sourceSha = sourceBranchResponse.data.object.sha;

        console.log("Source branch response:", sourceBranchResponse.data);
        console.log("owner:", owner);
        console.log("repo:", repo);
        console.log("ref:", `refs/heads/${branchName}`);
        console.log("sha:", sourceSha);

        const createBranchResponse = await octokit.request('POST /repos/{owner}/{repo}/git/refs', {
            owner,
            repo,
            ref: `refs/heads/${branchName}`,
            sha: sourceSha,
            headers :{
                'Content-Type':'application/json',
                'Authorization': 'token %s' % octokit.auth,
            }
        });
        nbrequest++;
        if(createBranchResponse){
            console.log("Branch created successfully!");
            console.log(createBranchResponse)
        }

    } catch (error) {
        console.error('Error creating branch:', error.message);

        if (error.response) {
            console.error('Error details:', error.response.data);
            console.error('Status:', error.response.status);
            console.error('Headers:', error.response.headers);
        }
    }
}


async function commitChanges(owner, repo, branchName, filePath, updatedContent, sha, octokit) {
    try {
        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: filePath,
            message: `Update translations for ${filePath}`,
            content: Buffer.from(updatedContent).toString('base64'),
            sha,
            branch: branchName,
            // headers :{
            //     'Content-Type':'application/json',
            //     'Authorization': 'token %s' % octokit.auth,
            // }
        });
        nbrequest ++;
        return response.data.commit.sha;
    } catch (error) {
        console.error('Error committing changes:', error.message);
        return null;
    }
}

async function createPullRequest(owner, repo, sourceBranch, targetBranch, title, body, octokit) {
    try {
        const response = await octokit.request('POST /repos/{owner}/{repo}/pulls', {
            owner,
            repo,
            title,
            body,
            head: sourceBranch,
            base: targetBranch
        });
        return response.data.html_url;
    } catch (error) {
        console.error('Error creating pull request:', error.message);
        return null;
    }
}

async function listPullRequest(owner, repo, octokit){
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
            owner,
            repo
        });
        nbrequest ++;
        return response.data;
        
    } catch (error) {
        console.error('Error listing PR:', error.message);
        return [];
    }
}


async function testGetFilesDirectory() {
    const files = await listFilesInDirectory(owner, repo, path);
    console.log(files);
    console.log('Nb request git : '+ nbrequest);
}

async function testGetFileContent(nb, octokit) {
    const files = await listFilesInDirectory(owner, repo, path, octokit);
    const yamlContents = await fetchFileContent(owner, repo, files[nb].path, octokit);
    console.log(files);
    console.log(yamlContents);
    console.log('Nb request git : '+ nbrequest);
}

async function testGetFilesContent() {
    const files = await listFilesInDirectory(owner, repo, path);
    const yamlContents = await Promise.all(files.map(file => fetchFileContent(owner, repo, file.path)));
    console.log(yamlContents);
    console.log('Nb request git : '+ nbrequest);
}

async function testUpdateFileContent() {
    const files = await listFilesInDirectory(owner, repo, path);
    const yamlContents = await fetchFileContent(owner, repo, files[0].path);
    const translations = {
        "altLabel": "Atchoum",
        "prefLabel": "Ampères"
    };
    console.log(yamlContents);
    const updatedYamlContents = updateTranslations(yamlContents, translations, "fr")
    console.log(updatedYamlContents);
    console.log('Nb request git : '+ nbrequest);
}

async function testPR(octokit) {
    const files = await listFilesInDirectory(owner, repo, path, octokit);
    const yamlContents = await fetchFileContent(owner, repo, files[0].path, octokit);
    const translations = {
        "altLabel": "Atchoummm2.0",
        "prefLabel": "Ampères"
    };
    console.log(yamlContents);
    const updatedYamlContents = updateTranslations(yamlContents, translations, "fr")
    console.log(updatedYamlContents);
    
    const branchName = `${files[0].name}-${Date.now()}`;
    console.log(files[0].name)

    const response = await octokit.request('GET /user', {
        headers: {
            'Authorization': `token ${octokit.auth}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    const scopes = response.headers['x-oauth-scopes'];
    console.log('Token Scopes:', scopes);

    await createBranch(owner, repo, branchName, 'main', octokit);
    await commitChanges(owner, repo, branchName, files[0].path, updatedYamlContents.content, updatedYamlContents.sha, octokit);
    const prUrl = await createPullRequest(owner, repo, branchName, 'main', 'Update translationsssssssssssssssssss', 'This PR updates translations.', octokit);

    if (prUrl) {
        console.log('Pull request created:', prUrl);
    }
    console.log('Nb request git : '+ nbrequest);
}

async function testPutFileContent(){
    const files = await listFilesInDirectory(owner, repo, path);
    const yamlContents = await fetchFileContent(owner, repo, files[0].path);
    const translations = {
        "altLabel": "A",
        "prefLabel": "Ampères"
    };
    const updatedYamlContents = updateTranslations(yamlContents, translations, "fr")
    console.log(updatedYamlContents);
    putFile(updatedYamlContents,files[0].path)
    
}

async function testGetListPullRequest(octokit) {
    const files = await listPullRequest(owner, repo,octokit);
    console.log(files[0]);
    console.log('Nb request git : '+ nbrequest);
}

async function main() {
    try {
        const octokit = new Octokit({
            auth: "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"
        });
        
        // testGetFilesDirectory();
        
        // testGetFileContent(0,octokit);
        // testGetFilesContent();
        
        // testUpdateFileContent();
        
        // testPutFileContent();
        
        testPR(octokit);
        
        // testGetListPullRequest(octokit);
        
        
    } catch (error) {
        console.error('Main function error:', error.message);
    }
    
}

// main();


export {listFilesInDirectory, fetchFileContent, updateTranslations, createBranch, commitChanges, createPullRequest, listPullRequest};