import express from 'express';
import session from 'express-session';
import axios from 'axios';
import { Octokit } from '@octokit/rest';
import { listFilesInDirectory, fetchFileContent, updateTranslations, createBranch, commitChanges, createPullRequest } from '../modules/read_git.js';
import { parse, stringify } from "yaml";

const app = express();
const PORT = 3000;
const octokit = new Octokit({
    // auth: tocken
});

const owner = "Landormi";
const repo = "VLIZ_project-stage_2024";


const language = "fr";

const CLIENT_ID = 'Ov23lixU1XxqIib5KkT3';
const CLIENT_SECRET = '326909b94f082c5cda2d261f0decda36e671de4e';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());



app.use(session({
    secret: 'votre_secret_de_session',
    resave: false,
    saveUninitialized: true
}));

// index
app.get('/', (req, res) => {
    res.send('<a href="/login">Connectez-vous avec GitHub</a>');
});

// connection
app.get('/login', (req, res) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&scope=write:packages%20write:repo_hook%20repo`;
    res.redirect(githubAuthUrl);
});

// Route de callback OAuth
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    try {
        // console.log("befor axios POST")
        const response = await axios.post('https://github.com/login/oauth/access_token', {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            code
        }, {
            headers: {
                accept: 'application/json'
            }
        });
        // console.log("axios.post('https://github.com/login/oauth/access_token' ...")

        const { access_token } = response.data;
        req.session.accessToken = access_token;
        octokit.auth = access_token;
        res.redirect('/display');
    } catch (error) {
        res.status(500).send('authentication error');
    }
});

// Route pour afficher le formulaire de saisie de la collection
app.get('/display', (req, res) => {
    res.send(`
        <form action="/display" method="post">
            <label for="collection">Entrez la collection :</label>
            <input type="text" id="collection" name="collection" required>
            <button type="submit">Afficher</button>
        </form>
    `);
  });

// Route pour traiter le formulaire et rediriger vers /display/:collection
app.post('/display', (req, res) => {
    const { collection } = req.body;
    res.redirect(`/display/${collection}`);
  });

// Route pour afficher les fichiers de la collection spécifiée
app.get('/display/:collection', async (req, res) => {
    const { collection } = req.params;
    const accessToken = req.session.accessToken;
  
    if (!accessToken) {
        return res.redirect('/');
    }
  
    try {
        const files = await listFilesInDirectory(owner, repo, collection, octokit);
        let fileListHtml = '<ul>';
    
        if (files.length > 0) {
            files.forEach(file => {
            fileListHtml += `<li><a href="/display/${collection}/${file.name}">${file.name}</a></li>`;
            });
        } else {
            fileListHtml += '<li>No YAML files found in the specified directory.</li>';
        }
    
        fileListHtml += '</ul>';
    
        res.send(`
            <h1>Fichiers dans la collection ${collection}</h1>
            ${fileListHtml}
        `);
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération des fichiers');
    }
  });

// Route pour afficher le comptenut d'un fichier spécifiée
app.get('/display/:collection/:file', async (req, res) => {
    const accessToken = req.session.accessToken;
    if (!accessToken) {
        return res.redirect('/');
    }
    const { collection, file } = req.params;
    
    // const language = req.headers['accept-language'] || 'en'; // Utiliser l'en-tête Accept-Language pour définir la langue par défaut
    // console.log(collection + "/" + file);

    

    try {
        const contents = await fetchFileContent("Landormi", "VLIZ_project-stage_2024", collection + "/" + file, octokit);
        const parseContents = parse(contents.content);
        
        let contentHtml = `
            <form method="POST" action="/pr/${collection}/${file}">
                <ul>
        `;
    
        if (parseContents.labels.length > 0) {
            parseContents.labels.forEach((label, index) => {
                const translation = label.translations.find(t => t.hasOwnProperty(language));
                // console.log(translation)
                const translationText = translation[language];
                contentHtml += `
                    <li>
                        <div>
                            <label>${label.name} :</label>
                            <span>${label.original}</span>
                        </div>
                        <div>
                            <label>Translations (${language}):</label>
                            <input type="text" name="translations[${label.name}]" value="${translationText}" disabled>
                            <button type="button" onclick="toggleEdit(this)">Edit</button>
                        </div>
                    </li>
                `;
            });
        } else {
            contentHtml += `<li>${parseContents}</li>`;
        }
    
        contentHtml += `
                </ul>
                <button type="submit">Send modify</button>
            </form>
            
            <script>
                function toggleEdit(button) {
                    const input = button.previousElementSibling;
                    input.disabled = false;
                    button.textContent = 'New';
                    button.disabled = true; // Désactiver le bouton après l'avoir cliqué
                }
            </script>
        `;
    
        res.send(`
            <h1>Contenu du fichier ${file}</h1>
            <h2><a href="/display/${collection}">Go Back</a></h2>
            ${contentHtml}
        `);
    } catch (error) {
        res.status(500).send('Erreur lors de la récupération des fichiers : ' + error.message);
    }
});

app.post('/pr/:collection/:file', async (req, res) => {
    const accessToken = req.session.accessToken;
  
    if (!accessToken) {
        return res.redirect('/');
    }
    try{
        const { collection, file } = req.params;
        const translations = req.body.translations;
        const modifiedTranslations = {};
        for (const labelName in translations) {
            if (translations.hasOwnProperty(labelName)) {
                modifiedTranslations[labelName] = translations[labelName];
            }
        }
        console.log(modifiedTranslations);
        console.log("1");
        const contents = await fetchFileContent(owner, repo, collection + "/" + file, octokit);
        console.log("fetchFileContent");
        const updatedContents = updateTranslations(contents, translations, language)
        // console.log(updatedContents)
        console.log("updateTranslations");
        const branchName = `${file}-${Date.now()}`;

        const response = await octokit.request('GET /user', {
            headers: {
                'Authorization': `token ${octokit.auth}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const scopes = response.headers['x-oauth-scopes'];
        console.log('Token Scopes:', scopes);
        console.log(response);

        await createBranch(owner, repo, branchName, 'main', octokit);
        console.log("createBranch");
        // await commitChanges(owner, repo, branchName, collection + "/" + file, updatedContents.content, updatedContents.sha, octokit);
        // console.log("commitChanges");
        // const prUrl = await createPullRequest(owner, repo, branchName, 'main', 'Update translationsssssssssssssssssss', 'This PR updates translations.');
        // console.log("createPullRequest");
        // if (prUrl) {
        //     console.log('Pull request created:', prUrl);
        // }
        res.send('...');
    }catch(error){
        res.status(500).send('Erreur lors de la modification du fichier : ' + error.message);
    }
});




// Route de profil utilisateur
// app.get('/profile', async (req, res) => {
//     const accessToken = req.session.accessToken;

//     if (!accessToken) {
//         return res.redirect('/');
//     }

//     const octokit = new Octokit({ auth: accessToken });

//     try {
//         const { data } = await octokit.request('/user');
//         res.send(`<h1>Hello, ${data.login}</h1><p>Your GitHub profile : <a href="${data.html_url}">${data.html_url}</a></p>`);
//     } catch (error) {
//         res.status(500).send('Erreur lors de la récupération des données utilisateur');
//     }
// });

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`Serveur démarré sur http://localhost:${PORT}`);
});
