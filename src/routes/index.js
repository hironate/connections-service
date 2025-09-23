const webhooks = require('./webhooks');
const oauth = require('./oauth');
const connections = require('./connections');

module.exports = (app) => {
  oauth(app);
  connections(app);
  webhooks(app);
};
