async function signup(email, password)
{
    return await client.auth.signUp({email, password});
}

async function login(email, password)
{
    return await client.auth.signInWithPassword({email, password});
}

async function logout()
{
    return await client.auth.signOut();
}

async function getUser()
{
    return await client.auth.getUser();
}