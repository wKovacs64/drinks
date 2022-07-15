export async function fetchGraphQL(
  url: string,
  token: string,
  query: string,
  variables: Record<
    string,
    string | number | boolean | null | Array<string> | Array<number>
  >,
) {
  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
}
