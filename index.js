const axios = require("axios");
const querystring = require("querystring");
const alphaSort = require("alpha-sort");
const { Octokit } = require("@octokit/rest");

const {
  GITHUB_TOKEN,
  REPOSITORY_OWNER,
  REPOSITORY_NAME,
  GIST_ID
} = process.env;

const octokit = new Octokit({
  auth: `token ${GITHUB_TOKEN}`
});

(async () => {
  const {
    headers: { link }
  } = await axios.get(
    `https://api.github.com/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}/forks`,
    {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`
      }
    }
  );
  const lastLink = /<.*>/.exec(link.split(",")[1])[0].slice(1, -1);
  const base = lastLink.split("?")[0];
  const { page: last } = querystring.parse(lastLink.split("?")[1], null);

  const u = (
    await Promise.all(
      [...new Array(Number(last)).keys()]
        .map(i => `${base}?${querystring.stringify({ page: i + 1 })}`)
        .map(url =>
          axios
            .get(url, {
              headers: {
                Authorization: `token ${GITHUB_TOKEN}`
              }
            })
            .then(({ data }) =>
              data.map(
                ({
                  html_url: repo_url,
                  full_name: repo_name,
                  owner: { login, avatar_url, html_url: user_url }
                }) => ({
                  login,
                  avatar_url,
                  repo_url,
                  repo_name,
                  user_url
                })
              )
            )
        )
    )
  )
    .flat()
    .sort(({ login: A }, { login: B }) => alphaSort.ascending(A, B));

  await octokit.gists.update({
    gist_id: GIST_ID,
    description:
      "https://github.com/hamukazu/lets-get-arrested/network/members",
    files: {
      "who-folked-lets-get-arrested.md": {
        content: [
          "|icon|||",
          "|:-:|---|---|",
          ...u.map(
            ({ login, avatar_url, repo_url, repo_name, user_url }) =>
              `|<img width="32" height="32" src="${avatar_url}" alt="${login}">|[${login}](${user_url})|[${repo_name}](${repo_url})|`
          )
        ].join("\n")
      },
      "who-folked-lets-get-arrested": {
        content: u.map(({ login }) => login).join("\n")
      }
    }
  });
})();
