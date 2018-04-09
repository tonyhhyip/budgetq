/* eslint-disable global-require */

// eslint-disable-next-line import/no-unresolved
const assets = require('../dist/assets.json');
const { PRODUCTION } = require('../env');

const scripts = ['manifest', 'vendor', 'app'].reduce((arr, name) => {
  if (name in assets) {
    arr.push(assets[name].js);
  }
  return arr;
}, []);

const styles = [];
if ('css' in assets.app) {
  styles.push(assets.app.css);
}

// eslint-disable-next-line
let createApp = require('../lib/app').createApp;

if (!PRODUCTION) {
  console.log('Compile for SSR');
  const webpack = require('webpack');
  const bundleCache = require.resolve('../lib/app');
  const serverConfig = require('../build/webpack.server.conf');
  const compiler = webpack(serverConfig);
  compiler.watch({
    ignored: /node_modules/,
    polling: true,
  }, (err, stats) => {
    console.log('Webpack update SSR bundle');
    if (err) {
      console.error(err);
    } else {
      console.log(stats.toString('minimal'));
      delete require.cache[bundleCache];
      // eslint-disable-next-line
      createApp = require('../lib/app').createApp;
    }
  });
}

module.exports = function (app) {
  app.get('*', (req, res) => {
    createApp({ location: req.url })
      .then(({
        content, context, store, notFound,
      }) => {
        if (notFound) {
          res.status(404);
        }
        if (context && context.url) {
          res.redirect(302, context.url);
        } else {
          const { reply } = store.getState();
          let title = '開支預算問題書面答覆搜尋器';
          let ogImage = '/gov_bg.png';
          let keywords = ['g0vhk', '立法會', '財委會', '開放數據'];
          let ogDescription = '';
          if (reply && reply.data) {
            const { data } = reply;
            title = `開支預算問題書面答覆搜尋器 - ${data.member}-${data.key}`;
            ogImage = `https://storage.googleapis.com/g0vhk/public/budgetq/${data.year}/${data.bureau}/${data.key}.png`;
            ogDescription = `${data.member}:${data.question.substring(0, 100)}`;
            keywords = keywords.concat(data.keywords);
          }
          res.render('page', {
            scripts,
            styles,
            content,
            store: store.getState(),
            title,
            ogImage,
            keywords: keywords.join(', '),
            ogDescription,
          });
        }
        res.end();
      });
  });
};
