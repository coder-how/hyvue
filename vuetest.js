const { isProxy } = require('./vue3')

var hyVue = (function (exports) {
  'use strict'

  const Fragment = Symbol('Fragment')
  const Text = Symbol('Text')
  const Comment = Symbol('Comment')
  const Static = Symbol('Static')
  const isFunction = val => typeof val === 'function'
  function isVNode(value) {
    return value ? value.__v_isVNode === true : false
  }

  function getExposeProxy(instance) {
    return {}
  }

  let renderer
  let patchProp
  let nodeOps
  const rendererOptions = /*#__PURE__*/ extend({ patchProp }, nodeOps)
  function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions))
  }
  function createRenderer() {
    return baseCreateRender(options)
  }
  function baseCreateRenderer(options) {
    const target = window
    target.__VUE__ = true
    const {} = options

    const patch = (n1, n2, container) => {
      if (n1 === n2) {
        return
      }
      if (n2.patchFlag === -2) {
      }
    }
    const unmount = () => {}

    const render = (vnode, container) => {
      if (vnode == null) {
        if (container._vnode) {
          unmount(container._vode, null, null, true)
        }
      } else {
        patch(container._vnode || null, vnode, container)
      }

      container._vnode = vnode
    }

    return {
      render,
      createApp: createAppAPI(render),
    }
  }

  function createAppContext() {
    return {}
  }

  function createVNode(
    type,
    props = null,
    children = null,
    patchFlag = 0,
    dynamicProps = null,
    isBlockNode = false
  ) {
    if (isVNode(type)) {
    }
    const shapeFlag = isString(type)
      ? 1 /* ELEMENT */
      : isSuspense(type)
      ? 128 /* SUSPENSE */
      : isTeleport(type)
      ? 64 /* TELEPORT */
      : isObject(type)
      ? 4 /* STATEFUL_COMPONENT */
      : isFunction(type)
      ? 2 /* FUNCTIONAL_COMPONENT */
      : 0
    return createBaseVNode(
      type,
      props,
      children,
      patchFlag,
      dynamicProps,
      shapeFlag,
      isBlockNode,
      true
    )
  }

  // shapeFlag 1  needFullChildrenNormalization true
  function createBaseVNode(
    type,
    props = null,
    children = null,
    patchFlag = 0,
    dynamicProps = null,
    shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */,
    isBlockNode = false,
    needFullChildrenNormalization = false
  ) {}

  function createAppAPI(render) {
    return function createApp(rootComponent, rootProps = null) {
      if (!isFunction(rootComponent)) {
        rootComponent = Object.assign({}, rootComponent)
      }
      const context = createAppContext()
      let isMounted = false
      const app = (context.app = {
        mount(rootContainer) {
          if (!isMounted) {
            const vnode = createVNode(rootComponent)
            vnode.appContext = context
            context.reload = () => {
              render(cloneVNode(vnode), rootContainer)
            }
            render(vnode, rootContainer)
            isMounted = true
            app._container = rootContainer
            return getExposeProxy(vnode.component)
          }
        },
      })
      return app
    }
  }

  const createApp = (...args) => {
    const app = ensureRenderer().createApp(...args)
    const { mount } = app
    app.mount = containerOrSelect => {
      const container = normalizeContainer(containerOrSelect)
      if (container) {
        return mount(container, true)
      }
    }
    return app
  }

  exports.createApp = createApp
  return exports
})({})
