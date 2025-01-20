const axios = require('axios');

const postmanApiUrl = 'https://api.getpostman.com';

// Get Postman collections
async function getCollections(apiKey) {
    const collections = [];
    try {
        const response = await axios.get(`${postmanApiUrl}/collections`, {
            headers: { 'X-Api-Key': apiKey },
        });
        for (const collection of response.data.collections) {
            const detailed = await axios.get(`${postmanApiUrl}/collections/${collection.uid}`, {
                headers: { 'X-Api-Key': apiKey },
            });
            collections.push(detailed.data.collection);
        }
    } catch (error) {
        //console.error("Error fetching collections:", error.message);
    }
    return collections;
}



// Get Postman environments
async function getEnvironments(apiKey) {
    const environments = [];
    try {

        const response = await axios.get(`${postmanApiUrl}/environments`, {
            headers: { 'X-Api-Key': apiKey },
        });

        for (const env of response.data.environments) {
            const detailed = await axios.get(`${postmanApiUrl}/environments/${env.uid}`, {
                headers: { 'X-Api-Key': apiKey },
            });
            environments.push(detailed.data.environment);
        }
    } catch (error) {
        //console.error("Error fetching environments:", error.message);
    }
    return environments;
}


// Save content to GitHub
async function saveToGitHub(content, config, filePath, branch, message) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const repoOwner = config.GITHUB_USERNAME;
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };

    try {

        // Check if the file exists
        const response = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${branch}`,
            { headers }
        );
        const sha = response.data.sha;

        // Update the existing file
        await axios.put(
            `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                message,
                content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
                sha,
                branch,
            },
            { headers }
        );

        // console.log(`File '${filePath}' updated successfully on branch '${branch}'.`);
    } catch (error) {
        if (error.response?.status === 404) {

            // Create the new file
            try {
                await axios.put(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    {
                        message,
                        content: Buffer.from(JSON.stringify(content, null, 2)).toString('base64'),
                        branch,
                    },
                    { headers }
                );
            } catch (createError) {
               // console.error(`Error creating the file '${filePath}':`, createError.message);
                throw createError;
            }
        } else {
            //console.error(`Error checking or updating file '${filePath}':`, error.message);
            throw error;
        }
    }
}



async function ensureBaseBranchExists(config, baseBranch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const repoOwner = config.GITHUB_USERNAME;
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };


    try {
        // Check if the base branch exists
        const response = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/branches/${baseBranch}`,
            { headers }
        );
    } catch (error) {
        if (error.response?.status === 404) {
            console.log(`Base branch '${baseBranch}' does not exist.`);

            // Attempt to create an initial commit
            const commitMessage = "Initial commit";
            const content = Buffer.from("# Initial Commit\nThis repository is initialized.").toString('base64');
            const filePath = "README.md";

            try {
                await axios.put(
                    `https://api.github.com/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    {
                        message: commitMessage,
                        content,
                        branch: baseBranch,
                    },
                    { headers }
                );
                console.log(`Base branch '${baseBranch}' created successfully with an initial commit.`);
            } catch (initError) {
                if (initError.response?.status === 403) {
                    error.message = `You do not have permission to initialize the repository. Please ask the owner to create the base branch.`;
                } else {
                    error.message = `Error initializing repository with branch '${baseBranch}': ${initError.message}`
                }
                throw initError;
            }
        } else if (error.response?.status === 403) {
            error.message = `You do not have permission to access the repository.`;
            throw error;
        } else if (error.response?.status === 404) {
            error.message = 'GitHub User, Repository or Branch may not exist.';
            throw error;
        } else {
            throw error;
        }
    }
}



// Create a new branch
async function createBranch(config, baseBranch, newBranch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const repoOwner = config.GITHUB_USERNAME;

    try {
        const baseBranchResponse = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/git/ref/heads/${baseBranch}`,
            { headers: { Authorization: `token ${config.GITHUB_TOKEN}` } }
        );
        const baseSha = baseBranchResponse.data.object.sha;

        await axios.post(
            `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs`,
            {
                ref: `refs/heads/${newBranch}`,
                sha: baseSha,
            },
            { headers: { Authorization: `token ${config.GITHUB_TOKEN}` } }
        );
        //console.log(`Branch '${newBranch}' created successfully.`);
    } catch (error) {
        if (error.response?.status === 422) {
           // console.warn(`Branch '${newBranch}' already exists.`);
        } else {
            //console.error(`Error creating branch '${newBranch}':`, error.message);
            throw error;
        }
    }
}

// Create a pull request
async function createPullRequest(config, branchName, baseBranch = 'main', commitMsg) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const repoOwner = config.GITHUB_USERNAME;

    try {
        const response = await axios.post(
            `https://api.github.com/repos/${repoOwner}/${repoName}/pulls`,
            {
                title: commitMsg || `Sync Postman collections and environments`,
                head: branchName,
                base: baseBranch,
                body: `Automated sync of Postman collections and environments to branch '${branchName}'.`,
            },
            { headers: { Authorization: `token ${config.GITHUB_TOKEN}` } }
        );

        const hyperlink = `\x1b]8;;${response.data.html_url}\x1b\\\x1b[32m${response.data.html_url}\x1b[0m\x1b]8;;\x1b\\`;
        console.log(`Pull request created. use below link to review & merge. \nlink: ${hyperlink}\n`);
    } catch (error) {
        //console.error(`Error creating pull request:`, error);
        if (error.status == 422) {
            const response = await getExistingPrOfBranch(config, branchName, baseBranch);
            const hyperlink = `\x1b]8;;${response.html_url}\x1b\\\x1b[32m${response.html_url}\x1b[0m\x1b]8;;\x1b\\`;
            console.log(`Pull request updated. use below link to review & merge. \nlink: ${hyperlink}\n`);
            return;
        }
        throw error;
    }
}

async function getExistingPrOfBranch(config, branchName, baseBranch = 'main') {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const repoOwner = config.GITHUB_USERNAME;

    try {
        const response = await axios.get(
            `https://api.github.com/repos/${repoOwner}/${repoName}/pulls`,
            { headers: { Authorization: `token ${config.GITHUB_TOKEN}` } }
        );
        const existingPR = response.data.find(pr => pr.head.ref === branchName && pr.base.ref === baseBranch);
        return existingPR; 
    } catch (error) {
        //console.error(`Error checking pull request for branch '${branchName}':`, error.message);
        throw error;
    }
}


async function ensureBranchExists(config, branch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };

    try {
        const response = await axios.get(
            `https://api.github.com/repos/${config.GITHUB_USERNAME}/${repoName}/branches/${branch}`,
            { headers }
        );
        return true;
    } catch (error) {
        if (error.response?.status === 404) {
            //console.log(`Branch '${branch}' does not exist.`);
            return false;
        }
        //console.error(`Error checking branch '${branch}':`, error.message);
    }
}

// Sync collections and environments to GitHub and create a pull request
async function pushOnGithub(config, newBranch, baseBranch = 'main', commitMsg) {

    await ensureBaseBranchExists(config, baseBranch);

    // create branch if not exists
    const branchExists = await ensureBranchExists(config, newBranch);
    // console.log("branchExists", branchExists)

    if (!branchExists) {
        // console.log("creating branch")
        await createBranch(config, baseBranch, newBranch);
    }

    // Sync collections
    const collections = await getCollections(config.POSTMAN_API_KEY);

    const oldCollections = await fetchAllCollectionsFromGitHub(config, baseBranch);
    // console.log("oldCollections here", oldCollections)


    const isDuplicate = hasDuplicateCollection(collections);

    if (isDuplicate) throw new Error('Duplicate collections not allowed');

    for (const collection of collections) {

        let updatedCollection = collection;

        const isExists = oldCollections.find(item => item.name == collection.info.name);

        if (isExists) {
            const infoUpdates = {
                _postman_id: isExists.content.info._postman_id,
                createdAt: isExists.content.info.createdAt,
                updatedAt: isExists.content.info.updatedAt,
                lastUpdatedBy: isExists.content.info.lastUpdatedBy,
                uid: isExists.content.info.uid
            }

            const itemUpdates = [];

            for (let i = 0; i < collection.item.length; i++) {
                const currItem = collection.item[i];
                const findItem = isExists?.content?.item.find(ele => ele.name == currItem.name);
                const obj = {
                    id: currItem.id,
                    updates: {
                        id: findItem.id,
                        uid: findItem.uid
                    }
                }
                itemUpdates.push(obj);
            }

            updatedCollection = updateCollection(collection, infoUpdates, itemUpdates)
        }

        const filePath = `Collections/${collection.info.name}.json`;
        await saveToGitHub(updatedCollection, config, filePath, newBranch, `Sync collection: ${collection.info.name}`);
    
    }

    // Sync environments
    const environments = await getEnvironments(config.POSTMAN_API_KEY);

    const oldEnvironments = await fetchEnvironmentsFromGitHub(config, baseBranch);


    // console.log("oldEnvironments env", oldEnvironments)

    const isDuplicateEnv = hasDuplicateEnv(environments);
    if (isDuplicateEnv) throw new Error('Duplicate env not allowed');;

    // console.log("all from postman env", environments);
    // console.log("all from github", oldEnvironments);

    const updatedEnvironments = environments.map((env) => {
        const existingEnv = oldEnvironments.find((oldEnv) => oldEnv.name === env.name);

        if (existingEnv) {
            return {
                ...env,
                id: existingEnv.id,
                uid: existingEnv.uid,
                owner: existingEnv.owner,
                createdAt: existingEnv.createdAt,
                updatedAt: existingEnv.updatedAt,
            };
        }

        return env;
    });
    const envFilePath = `Environments/environments.json`;
    await saveToGitHub(updatedEnvironments, config, envFilePath, newBranch, "Sync all environments");

    // Create a pull request
    await createPullRequest(config, newBranch, baseBranch, commitMsg);

}



async function pullFromGithub(config, branch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };
    const baseUrl = `https://api.github.com/repos/${config.GITHUB_USERNAME}/${repoName}/contents`;

    const collectionsPath = `${baseUrl}/Collections?ref=${branch}`;
    const environmentsPath = `${baseUrl}/Environments/environments.json?ref=${branch}`;

    const postmanCollections = await getCollections(config.POSTMAN_API_KEY);
    const postmanEnvironments = await getEnvironments(config.POSTMAN_API_KEY);

    try {
        // Pull collections
        const response = await axios.get(collectionsPath, { headers });
        const githubCollections = response.data;

        for (const file of githubCollections) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const fileResponse = await axios.get(file.download_url);
                const githubCollection = fileResponse.data;

                const existingCollection = postmanCollections.find(
                    (col) => col.info.name === githubCollection.info.name
                );

                if (existingCollection) {
                    //console.log(`Updating collection: ${githubCollection.info.name}`);
                    await updatePostmanCollection(
                        config.POSTMAN_API_KEY,
                        existingCollection.info.uid,
                        githubCollection
                    );
                } else {
                    //console.log(`Pulling collection: ${githubCollection.info.name}`);
                    // Create the collection in Postman
                    await createPostmanCollection(config.POSTMAN_API_KEY, githubCollection);
                }
            }
        }

        // Pull environments
        const envResponse = await axios.get(environmentsPath, { headers });
        const githubEnvironments = JSON.parse(Buffer.from(envResponse.data.content, 'base64').toString('utf8'));

        // console.log("githubEnvironments here", githubEnvironments)
        // console.log("postmanEnvironments here", postmanEnvironments)

        for (const githubEnvironment of githubEnvironments) {
            const existingEnvironment = postmanEnvironments.find((env) => env.name == githubEnvironment.name);

            if (existingEnvironment) {
               // console.log(`Updating environment: ${githubEnvironment.name}`);
                // updating if exists
                await updatePostmanEnvironment(
                    config.POSTMAN_API_KEY,
                    existingEnvironment.uid,
                    githubEnvironment
                );
            } else {
                //console.log(`Pulling environment: ${githubEnvironment.name}`);
                // creating new
                await createPostmanEnvironment(config.POSTMAN_API_KEY, githubEnvironment);
            }
        }

        //console.log('Pull operation completed.');
    } catch (error) {
        //console.error('Error pulling from GitHub:', error.message);
        if (error.response?.status === 404) {
            error.message = 'GitHub User, Repository or Branch may not exist.';
        }
        throw error;
    }
}


function hasDuplicateCollection(collections) {
    let seenCollections = new Set();

    for (const collection of collections) {
        if (seenCollections.has(collection.info.name)) {
            return true;
        }
        seenCollections.add(collection.info.name);

        let seenItems = new Set();
        for (const item of collection.item) {
            if (seenItems.has(item.name)) {
                return true;
            }
            seenItems.add(item.name);
        }
    }

    return false;
}

function hasDuplicateEnv(records) {
    const seenNames = new Set();

    for (const record of records) {
        if (seenNames.has(record.name)) {
            return true;
        }
        seenNames.add(record.name);
    }

    return false;
}

// Create a new collection in Postman
async function createPostmanCollection(apiKey, collection) {
    try {
        const response = await axios.post(
            `${postmanApiUrl}/collections`,
            { collection },
            { headers: { 'X-Api-Key': apiKey } }
        );
        //console.log(`Collection '${collection.info.name}' added to Postman.`);
    } catch (error) {
        //console.error(`Error creating Postman collection '${collection.info.name}':`, error.message);
        throw error;
    }
}

// Delete all Postman collections
async function deleteAllPostmanCollections(apiKey) {
    try {
        const response = await axios.get(`${postmanApiUrl}/collections`, {
            headers: { 'X-Api-Key': apiKey },
        });

        const collections = response.data.collections ?? [];
        for (const collection of collections) {
            await axios.delete(`${postmanApiUrl}/collections/${collection.uid}`, {
                headers: { 'X-Api-Key': apiKey },
            });
        }
    } catch (error) {
        //console.error('Error deleting Postman collections:', error.message);
        throw error;
    }
}

// Hard pull collections from GitHub to Postman
async function hardPullPostmanCollections(config, branch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };
    const baseUrl = `https://api.github.com/repos/${config.GITHUB_USERNAME}/${repoName}/contents`;

    // Delete all existing collections in Postman
    await deleteAllPostmanCollections(config.POSTMAN_API_KEY);

    // Get all collections from GitHub
    const collectionsPath = `${baseUrl}/Collections?ref=${branch}`;
    try {
        const response = await axios.get(collectionsPath, { headers });
        const githubCollections = response.data;

        for (const file of githubCollections) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const fileResponse = await axios.get(file.download_url);
                const githubCollection = fileResponse.data;

                // Add the collection to Postman
                await createPostmanCollection(config.POSTMAN_API_KEY, githubCollection);
            }
        }

        //console.log('Hard pull operation completed.');
    } catch (error) {
        //console.error('Error pulling collections from GitHub:', error.message);
        if (error.response?.status === 404) {
            error.message = 'GitHub User, Repository or Branch may not exist.';
        }
        throw error;
    }
}

async function fetchAllCollectionsFromGitHub(config, branch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };
    const baseUrl = `https://api.github.com/repos/${config.GITHUB_USERNAME}/${repoName}/contents/Collections`;

    try {
        const response = await axios.get(`${baseUrl}?ref=${branch}`, { headers });
        const files = response.data;

        const collections = [];
        for (const file of files) {
            if (file.type === 'file' && file.name.endsWith('.json')) {
                const fileResponse = await axios.get(file.download_url);
                collections.push({
                    name: file.name.replace('.json', ''),
                    content: fileResponse.data,
                });
            }
        }

        // console.log('Fetched all collections from GitHub:', collections.map((c) => c.name));
        return collections;
    } catch (error) {
        //console.log('No collection found');
        return [];
    }
}

function updateCollection(collection, infoUpdates, itemUpdates) {
    if (!collection || typeof collection !== 'object') {
        throw new Error('Invalid collection object.');
    }

    // Update the `info` object with the provided key-value pairs
    if (infoUpdates && typeof infoUpdates === 'object') {
        for (const [key, value] of Object.entries(infoUpdates)) {
            if (collection.info && key in collection.info) {
                collection.info[key] = value;
            }
        }
    }

    // Update specific `item` in the `item` array based on `id`
    if (itemUpdates && Array.isArray(itemUpdates)) {
        itemUpdates.forEach(({ id, updates }) => {
            const item = collection.item.find((item) => item.id === id);
            if (item && updates && typeof updates === 'object') {
                for (const [key, value] of Object.entries(updates)) {
                    if (key in item) {
                        item[key] = value;
                    }
                }
            }
        });
    }

    return collection;
}

// Create a new Postman environment
async function createPostmanEnvironment(apiKey, environment) {
    try {
        const response = await axios.post(
            `${postmanApiUrl}/environments`,
            { environment },
            { headers: { 'X-Api-Key': apiKey } }
        );
       // console.log(`Environment '${environment.name}' added to Postman.`);
    } catch (error) {
       // console.error(`Error creating Postman environment '${environment.name}':`, error.message);
        throw error;
    }
}



// Update an existing Postman collection
async function updatePostmanCollection(apiKey, uid, collection) {
    try {
        // Ensure the collection payload is correctly structured
        if (!collection || !collection.info || !collection.item) {
            throw new Error(`Invalid collection data for updating collection: ${uid}`);
        }

        // Postman API requires `info` and `item` fields for updating a collection
        const payload = {
            collection: {
                info: {
                    name: collection.info.name,
                    schema: collection.info.schema,
                },
                item: collection.item,
            },
        };

        // Make the PUT request to update the collection
        const response = await axios.put(
            `${postmanApiUrl}/collections/${uid}`,
            payload,
            { headers: { 'X-Api-Key': apiKey } }
        );

        // console.log(`Collection '${collection.info.name}' updated successfully in Postman.`);
    } catch (error) {
        //console.error(`Error updating Postman collection '${uid}':`, error.message);
        throw error;
    }
}


// Update an existing Postman environment
async function updatePostmanEnvironment(apiKey, uid, environment) {
    try {
        // Ensure the environment payload is correctly structured
        if (!environment || !environment.name || !environment.values) {
            throw new Error(`Invalid environment data for updating environment: ${uid}`);
        }

        // Construct the payload to meet Postman API requirements
        const payload = {
            environment: {
                name: environment.name,
                values: environment.values,
            },
        };

        // Make the PUT request to update the environment
        const response = await axios.put(
            `${postmanApiUrl}/environments/${uid}`,
            payload,
            { headers: { 'X-Api-Key': apiKey } }
        );

        // console.log(`Environment '${environment.name}' updated successfully in Postman.`);
    } catch (error) {
       // console.error(`Error updating Postman environment '${environment.name}':`, error.message);
        throw error;
    }
}


// Helper function to fetch environments from GitHub
async function fetchEnvironmentsFromGitHub(config, branch) {
    const repoName = config.GITHUB_REPO.split('/').pop().replace('.git', '');
    const headers = { Authorization: `token ${config.GITHUB_TOKEN}` };
    const envFilePath = `Environments/environments.json`;

    try {
        const response = await axios.get(
            `https://api.github.com/repos/${config.GITHUB_USERNAME}/${repoName}/contents/${envFilePath}?ref=${branch}`,
            { headers }
        );

        const content = JSON.parse(Buffer.from(response.data.content, 'base64').toString('utf-8'));
        return content;
    } catch (error) {
        if (error.response?.status === 404) {
            //console.log("No environments found on GitHub.");
            return [];
        }
       // console.error("Error fetching environments from GitHub:", error.message);
        throw error;
    }
}


function getOwnerName(url) {
    const urlString = String(url);
    const match = urlString.match(/github\.com\/([^\/]+)/);
    if (match && match[1]) {
        const ownerName = match[1];
        return ownerName
    } else {
        console.error("Owner name could not be extracted.");
    }
}

module.exports = {
    pushOnGithub,
    pullFromGithub,
    hardPullPostmanCollections,
    getOwnerName
};
