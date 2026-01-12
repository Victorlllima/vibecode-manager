import { Octokit } from "@octokit/rest";

export const getGithubClient = (accessToken: string) => {
    return new Octokit({
        auth: accessToken,
    });
};

export async function getUserRepositories(accessToken: string) {
    const octokit = getGithubClient(accessToken);

    try {
        const { data } = await octokit.rest.repos.listForAuthenticatedUser({
            sort: "updated",
            direction: "desc",
            per_page: 100,
            visibility: "all",
        });

        return data.map(repo => ({
            id: repo.id,
            name: repo.name,
            full_name: repo.full_name,
            html_url: repo.html_url,
            description: repo.description,
            private: repo.private,
            updated_at: repo.updated_at
        }));
    } catch (error) {
        console.error("Erro ao buscar repositórios:", error);
        return [];
    }
}
