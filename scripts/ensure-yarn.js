const agent = process.env.npm_config_user_agent;

if (!agent?.startsWith('yarn')) {
  console.error(
    'Please use yarn to manage dependencies in this repository.\n  $ npm install --global yarn\n'
  );
  process.exit(1);
}
