module.exports = {
  projects: {
    app: {
      schema: [
        {
          'https://api.studio.thegraph.com/query/115633/dungeon-delvers/v3.3.5': {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        },
      ],
      documents: ['src/**/*.{graphql,js,ts,jsx,tsx}'],
    },
  },
};