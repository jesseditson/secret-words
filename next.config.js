const withWorkers = require('@zeit/next-workers')

module.exports = withWorkers({
    workerLoaderOptions: {
        inline: true,
      }
})