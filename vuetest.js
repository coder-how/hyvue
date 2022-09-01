var hyVue = (function (exports) {
  'use strict'

  const createApp = (...args) => {
    const app = ensureRenderer().createApp(...args)
  }

  exports.createApp = createApp
  return exports
})({})
