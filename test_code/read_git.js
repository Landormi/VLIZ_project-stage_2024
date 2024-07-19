// import { Octokit } from "https://cdn.skypack.dev/@octokit/rest";
// import { parse, stringify } from "https://cdn.skypack.dev/yaml";
import { Octokit } from "octokit";
import { parse, stringify } from "yaml";



// const cacheList = new NodeCache();
//--------------------------Test const-------------------------------//
const owner = "Landormi";
const repo = "VLIZ_project-stage_2024";
const path = "P06";
const branchName = "The_Branch";
//-------------------------------------------------------------------//

let nbrequest = 0;

//-------------------------------------------------------------------//

async function listFilesInDirectory(owner, repo, directoryPath, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: directoryPath,
            ref: branchName
        });
        nbrequest ++;

        if (Array.isArray(response.data)) {
            const files = response.data.filter(item => item.type === 'file' && item.name.endsWith('.yml'));
            // console.log(response.data);
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
            path: filePath,
            ref: branchName
        });
        nbrequest ++;
        // console.log(response);
        
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
    
    contentObj.labels.forEach(label => {
        // console.log(label)
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

    yamlContents.content = stringify(contentObj,{ quotingType: '"', prettyErrors: true });
    return yamlContents;
}

async function commitChanges(owner, repo, branchName, filePath, updatedContent, sha, octokit) {
    // try {
    //     const branch = await octokit.request('GET /repos/{owner}/{repo}/branches/{branch}', {
    //         owner,
    //         repo,
    //         branch: branchName
    //     });
    //     console.log(`Branch found: ${branch.data.name}`);
    // } catch (error) {
    //     console.error(`Branch not found: ${error.message}`);
    // }
    // try {
    //     const file = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
    //         owner,
    //         repo,
    //         path: 'P06/http___vocab_nerc_ac_uk_collection_P06_current_AMPB_.yml',
    //         ref: branchName
    //     });
    //     console.log(`File found: ${file.data.path}`);
    // } catch (error) {
    //     console.error(`File not found: ${error.message}`);
    // }
    try {
        // console.log(owner);
        // console.log(repo);
        // console.log(branchName);
        // console.log(filePath);
        // console.log(updatedContent);
        // console.log(sha);
        const response = await octokit.request('PUT /repos/{owner}/{repo}/contents/{path}', {
            owner,
            repo,
            path: filePath,
            message: `Update translations for ${filePath}`,
            // content: Buffer.from(updatedContent).toString('base64'),
            content: "dXJpOiBodHRwOi8vdm9jYWIubmVyYy5hYy51ay9jb2xsZWN0aW9uL1AwNi9jdXJyZW50L0FNUEIvMS8KbGFiZWxzOgogIC0gbmFtZTogYWx0TGFiZWwKICAgIHBhdGg6IGh0dHA6Ly93d3cudzMub3JnLzIwMDQvMDIvc2tvcy9jb3JlI2FsdExhYmVsCiAgICBvcmlnaW5hbDogQQogICAgdHJhbnNsYXRpb25zOgogICAgICAtIGZyOiB0ZXN0IGluIHRlc3QKICAgICAgLSBlczogdGVzdCBlcz8/CiAgICAgIC0gZGU6ICIzIgogICAgICAtIGl0OiBBYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWFhYWEKICAtIG5hbWU6IGRlZmluaXRpb24KICAgIHBhdGg6IGh0dHA6Ly93d3cudzMub3JnLzIwMDQvMDIvc2tvcy9jb3JlI2RlZmluaXRpb24KICAgIG9yaWdpbmFsOiBUaGUgU0kgYmFzZSB1bml0IG9mIGVsZWN0cmljIGN1cnJlbnQgZXF1YWwgdG8gYSBmbG93IG9mIG9uZSBjb3Vsb21iCiAgICAgIHBlciBzZWNvbmQuCiAgICB0cmFuc2xhdGlvbnM6CiAgICAgIC0gZnI6ICIiCiAgICAgIC0gZXM6ICIiCiAgICAgIC0gZGU6ICIiCiAgICAgIC0gaXQ6ICIiCiAgLSBuYW1lOiBwcmVmTGFiZWwKICAgIHBhdGg6IGh0dHA6Ly93d3cudzMub3JnLzIwMDQvMDIvc2tvcy9jb3JlI3ByZWZMYWJlbAogICAgb3JpZ2luYWw6IEFtcGVyZXMKICAgIHRyYW5zbGF0aW9uczoKICAgICAgLSBmcjogcHBwCiAgICAgIC0gZXM6IG5vbgogICAgICAtIGRlOiAiIgogICAgICAtIGl0OiAiIgo=",
            sha,
            branch: branchName,
            headers :{
                'Content-Type':'application/json',
                'Authorization': 'token %s' % octokit.auth,
            }
        });
        console.log(response);
        nbrequest ++;
        return response.data.commit.sha;
    } catch (error) {
        console.error('Error committing changes:', error.message);
        console.error('Error committing changes:', error);
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
            repo,
            branch: branchName
        });
        nbrequest ++;
        return response.data;
        
    } catch (error) {
        console.error('Error listing PR:', error.message);
        return [];
    }
}

async function getLastCommitDateInMain(owner, repo, filePath, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/commits', {
            owner,
            repo,
            path: filePath,
            sha: 'main',
            per_page: 1
        });
        nbrequest++;
        if (response.status === 200 && response.data.length > 0) {
            return response.data[0].commit.committer.date;
        } else {
            console.error('Failed to retrieve last commit date in main:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        console.error('Error retrieving last commit date in main:', error.message);
        return null;
    }
}

async function getCommitsInBranch(owner, repo, filePath, branchName, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/commits', {
            owner,
            repo,
            path: filePath,
            sha: branchName
        });
        nbrequest++;
        if (response.status === 200) {
            // console.log(response.data);
            return response.data;
        } else {
            console.error('Failed to retrieve commits in branch:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error retrieving commits in branch:', error.message);
        return [];
    }
}

function filterCommitsByDate(commits, date) {
    const commit = commits.filter(commit => new Date(commit.commit.committer.date).setHours(0, 0, 0, 0) >= new Date(date).setHours(0, 0, 0, 0));
    // console.log(commits);
    return commit;
}

async function getCommitChanges(owner, repo, commitSha, octokit) {
    try {
        const response = await octokit.request('GET /repos/{owner}/{repo}/commits/{commit_sha}', {
            owner,
            repo,
            commit_sha: commitSha
        });
        nbrequest++;
        if (response.status === 200) {
            console.log(response.data.files)
            return response.data.files;
        } else {
            console.error('Failed to retrieve commit changes:', response.status, response.statusText);
            return [];
        }
    } catch (error) {
        console.error('Error retrieving commit changes:', error.message);
        return [];
    }
}

async function getRecentCommitChanges(owner, repo, filePath, branchName, octokit) {
    const lastMainCommitDate = await getLastCommitDateInMain(owner, repo, filePath, octokit);
    if (!lastMainCommitDate) {
        return [];
    }

    const branchCommits = await getCommitsInBranch(owner, repo, filePath, branchName, octokit);
    const recentCommits = filterCommitsByDate(branchCommits, lastMainCommitDate);

    const changes = [];
    for (const commit of recentCommits) {
        const commitChanges = await getCommitChanges(owner, repo, commit.sha, octokit);
        changes.push({
            sha: commit.sha,
            date: commit.commit.committer.date,
            files: commitChanges
        });
    }
    return changes;
}


async function testGetFilesDirectory(octokit) {
    const files = await listFilesInDirectory(owner, repo, path, octokit);
    // console.log(files);
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

async function testUpdateFileContent(octokit) {
    const files = await listFilesInDirectory(owner, repo, path,octokit);
    const yamlContents = await fetchFileContent(owner, repo, files[0].path,octokit);
    const translations = {
        "altLabel": "Atchoum",
        "prefLabel": "Ampères"
    };
    console.log(yamlContents);
    const updatedYamlContents = updateTranslations(yamlContents, translations, "fr")
    console.log(updatedYamlContents);
    console.log('Nb request git : '+ nbrequest);
}

async function testCommitRequest(octokit) {
    const files = await listFilesInDirectory(owner, repo, path, octokit);
    const file = files[0];
    const yamlContents = await fetchFileContent(owner, repo, file.path, octokit);
    const translations = {
        "altLabel": "test in test",
        "prefLabel": "test"
    };
    // console.log(yamlContents);
    const updatedYamlContents = updateTranslations(yamlContents, translations, "fr")
    // console.log(updatedYamlContents);
    // console.log(file.name)

    // const response = await octokit.request('GET /user', {
    //     headers: {
    //         'Authorization': `token ${octokit.auth}`,
    //         'Accept': 'application/vnd.github.v3+json'
    //     }
    // });
    // const scopes = response.headers['x-oauth-scopes'];
    // console.log('Token Scopes:', scopes);
    await commitChanges(owner, repo, branchName, file.path, updatedYamlContents.content, updatedYamlContents.sha, octokit);
    console.log('Nb request git : '+ nbrequest);
}


async function testGetListPullRequest(octokit) {
    const files = await listPullRequest(owner, repo,octokit);
    console.log(files);
    console.log('Nb request git : '+ nbrequest);
}

async function testGetListCommits(octokit) {
    const files = await listFilesInDirectory(owner, repo, path, octokit);
    const file = files[0];
    const changes = await getRecentCommitChanges(owner, repo, file.path, branchName, octokit);
    // changes.forEach(change => {
    //     console.log(change);
    //     console.log("-------------------------");
    //     // change.files.forEach(file => {
    //     //     console.log(file);
    //     // });
    // });
    // console.log(changes);
    console.log('Nb request git : '+ nbrequest);
}

async function main() {
    try {
        const octokit = new Octokit({
            auth: "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"
        });
        
        // await testGetFilesDirectory(octokit);
        // await testGetFileContent(0,octokit);
        // await testGetFilesContent();
        // await testUpdateFileContent(octokit);
        await testCommitRequest(octokit);
        // await testGetListPullRequest(octokit);
        // await testGetListCommits(octokit);
        
    } catch (error) {
        console.error('Main function error:', error.message);
    }
}


main();

export {listFilesInDirectory, fetchFileContent, updateTranslations, commitChanges, createPullRequest, listPullRequest};