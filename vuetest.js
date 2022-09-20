const { ReactiveEffect, compile, nodeOps, proxyRefs, Text, markRaw } = Vue

var hyVue = (function (exports) {
  'use strict'

  const EMPTY_OBJ = Object.freeze({})
  const EMPTY_ARR = Object.freeze([])
  const NOOP = () => {}

  const Fragment = Symbol('Fragment')
  const Comment = Symbol('Comment')
  const Static = Symbol('Static')
  const hasOwnProperty = Object.prototype.hasOwnProperty
  const hasOwn = (val, key) => {
    console.log('val:', val)
    console.log('key:', key)
    let flag = hasOwnProperty.call(val, key)
    console.log('-----')
    return flag
  }
  const isFunction = val => typeof val === 'function'
  const isString = val => typeof val === 'string'

  const isSuspense = type => type.__isSuspense
  const isTeleport = type => type.__isTeleport
  const isObject = val => val !== null && typeof val === 'object'
  const extend = Object.assign

  function patchClass(el, value) {
    if (value == null) {
      el.removeAttribute('calss')
    } else {
      el.className = value
    }
  }
  const patchProp = (el, key, prevValue, nextValue) => {
    if (key === 'class') {
      patchClass(el, nextValue)
    }
  }
  const rendererOptions = extend({ patchProp }, nodeOps)
  function isVNode(value) {
    return value ? value.__v_isVNode === true : false
  }

  function getExposeProxy(instance) {
    return {}
  }

  let renderer

  function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions))
  }
  function createRenderer(options) {
    return baseCreateRenderer(options)
  }
  function baseCreateRenderer(options) {
    const target = window
    target.__VUE__ = true
    const {
      insert: hostInsert,
      remove: hostRemove,
      patchProp: hostPatchProp,
      createElement: hostCreateElement,
      createText: hostCreateText,
      createComment: hostCreateComment,
      setText: hostSetText,
      setElementText: hostSetElementText,
      parentNode: hostParentNode,
      nextSibling: hostNextSibling,
      setScopeId: hostSetScopeId = NOOP,
      cloneNode: hostCloneNode,
      insertStaticContent: hostInsertStaticContent,
    } = options

    const patch = (n1, n2, container) => {
      if (n1 === n2) {
        return
      }
      const { type, ref, shapeFlag } = n2
      switch (type) {
        case Text:
          processText(n1, n2, container)
          break
        default:
          if (shapeFlag & 1 /* ELEMENT */) {
            processElement(n1, n2, container)
          } else if (shapeFlag & 6 /* COMPONENT */) {
            processComponent(n1, n2, container)
          }
      }
    }

    const processText = (n1, n2, container) => {
      if (n1 == null) {
        hostInsert((n2.el = hostCreateText(n2.children)), container)
      } else {
        const el = (n2.el = n1.el)
        if (n2.children !== n1.children) {
          hostSetText(el, n2, children)
        }
      }
    }

    const processElement = (n1, n2, container) => {
      if (n1 == null) {
        mountElement(n2, container)
      } else {
        patchElement(n1, n2)
      }
    }

    const mountElement = (vnode, container) => {
      let el = (vnode.el = hostCreateElement(vnode.type, false, false))
      console.log('create tag:', vnode.type)
      let { shapeFlag, props } = vnode
      if (shapeFlag & 8 /* TEXT_CHILDREN */) {
        hostSetElementText(el, vnode.children)
      } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
        mountChildren(vnode.children, el)
      }
      // props
      // 处理class，sytle，click等
      if (props) {
        for (const key in props) {
          hostPatchProp(el, key, null, props[key])
        }
      }
      hostInsert(el, container)
      console.log('mount tag:', vnode.type)
    }

    const mountChildren = (children, container) => {
      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        patch(null, child, container)
      }
    }

    const patchElement = () => {}

    const processComponent = (n1, n2, container) => {
      if (n1 == null) {
        mountComponent(n2, container)
      } else {
        updateComponent(n1, n2, container)
      }
    }

    const mountComponent = (initialVNode, container) => {
      const instance = (initialVNode.component = createComponentInstance(initialVNode))
      setupComponent(instance)
      setupRenderEffect(instance, initialVNode, container)
    }

    const setupRenderEffect = (instance, initialVNode, container) => {
      const componentUpdateFn = () => {
        console.log('---------------------------------------------------> track')
        if (!instance.isMounted) {
          const subTree = (instance.subTree = renderComponentRoot(instance))
          patch(null, subTree, container)
        } else {
          console.log('todo: update component')
        }
      }
      const update = (instance.update = () => effect.run())
      const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, update))
      update()
    }

    const unmount = () => {}
    const updateComponent = () => {}

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

  function renderComponentRoot(instance) {
    const { type, vnode, render, proxy, withProxy } = instance
    let result
    if (vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */) {
      const proxyToUse = withProxy || proxy
      result = normalizeVNode(render.call(proxyToUse, proxyToUse))
      console.log('render执行返回结果：', result)
    }
    return result
  }

  function normalizeVNode(child) {
    if (typeof child === 'object') {
      return cloneIfMounted(child)
    }
  }

  function cloneIfMounted(child) {
    return child.el === null || child.memo ? child : cloneVNode(child)
  }

  function cloneVNode(vnode) {
    return vnode
  }

  function createDevRenderContext(instance) {
    const target = {}
    Object.defineProperty(target, '_', {
      configurable: true,
      enumerable: false,
      get: () => instance,
    })
    return target
  }
  // tag:instance
  function createComponentInstance(vnode, parent, suspense) {
    const type = vnode.type
    const instance = {
      vnode,
      type,
      proxy: null,
      withProxy: null,
      accessCache: null,
      data: EMPTY_OBJ,
      setupState: EMPTY_OBJ,
      ctx: EMPTY_OBJ,
    }
    instance.ctx = createDevRenderContext(instance)
    instance.root = parent ? parent.root : instance
    // instance.emit = emit$1.bind(null, instance)
    return instance
  }

  function isStatefulComponent(instance) {
    return instance.vnode.shapeFlag & 4 /* STATEFUL_COMPONENT */
  }

  function setupComponent(instance) {
    const inStateful = isStatefulComponent(instance)
    const setupResult = inStateful ? setupStatefulComponent(instance) : undefined
    return setupResult
  }

  function setupStatefulComponent(instance) {
    const Component = instance.type

    instance.accessCache = Object.create(null)
    instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))

    const { setup } = Component
    if (setup) {
      const setupContext = (instance.setupContext =
        setup.length > 1 ? createSetupContext(instance) : null)
      // const setupResult = setup(shallowReadonly(instance.props), setupContext)
      const setupResult = setup()
      handleSetupResult(instance, setupResult)
    }
  }

  function createSetupContext(instance) {
    let attrs
    return Object.freeze({
      get attrs() {},
      get slots() {},
      get emit() {},
      expose,
    })
  }

  const PublicInstanceProxyHandlers = {
    get({ _: instance }, key) {
      const { setupState, accessCache, data } = instance
      if (key === '__isVue') {
        return true
      }
      console.log('------key:', key)
      console.log('------setupState:', setupState)
      console.log('------accessCache:', accessCache)
      console.log(hasOwn(setupState, key))

      // script setup
      if (setupState !== EMPTY_OBJ && setupState.__isScriptSetup && hasOwn(setupState, key)) {
        return setupState[key]
      }
      {
        const n = accessCache[key]
        if (n !== undefined) {
          console.log('999999')
          switch (n) {
            case 1:
              return setupState[key]
          }
        } else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
          console.log('22222222')
          accessCache[key] = 1 /* SETUP */
          return setupState[key]
        } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
          accessCache[key] = 2 /* DATA */
          return data[key]
        }
      }
    },
  }

  const RuntimeCompiledPublicInstanceProxyHandlers = Object.assign(
    {},
    PublicInstanceProxyHandlers,
    {
      get(target, key) {
        return PublicInstanceProxyHandlers.get(target, key, target)
      },
    }
  )

  let installWithProxy = i => {
    if (i.render._rc) {
      i.withProxy = new Proxy(i.ctx, RuntimeCompiledPublicInstanceProxyHandlers)
    }
  }

  function handleSetupResult(instance, setupResult) {
    if (isFunction(setupResult)) {
      instance.render = setupResult
    } else if (isObject(setupResult)) {
      instance.setupState = proxyRefs(setupResult)
      // 确保with取到值
      exposeSetupStateOnRenderContext(instance)
      finishComponentSetup(instance)
    }
  }

  function exposeSetupStateOnRenderContext(instance) {
    const { ctx, setupState } = instance
    Object.keys(setupState).forEach(key => {
      Object.defineProperty(ctx, key, {
        enumerable: true,
        configurable: true,
        get: () => setupState[key],
        set: NOOP,
      })
    })
  }

  function applyOptions(instance) {
    let options = instance.type
    debugger
    const ctx = instance.ctx
    let { data: dataOptions } = options
    if (isFunction(dataOptions)) {
      let data = dataOptions.call()
      instance.data = data
      if (!isObject(data)) {
        console.error('data must return object')
      } else {
        for (const key in data) {
          Object.defineProperty(ctx, key, {
            configurable: true,
            enumerable: true,
            get: () => {
              console.log('data---> :', data)
              return data[key]
            },
            set: NOOP,
          })
        }
      }
    } else {
      console.error('data is not function')
    }
  }

  // 根据template生成render
  function finishComponentSetup(instance) {
    const Component = instance.type
    if (!instance.render) {
      const template = Component.template
      if (template) {
        Component.render = compile(template, {})
        console.log('render fn', Component.render._rc)
      }
      instance.render = Component.render || NOOP
      installWithProxy(instance)
    }
    // support 2.x
    {
      applyOptions(instance)
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
    shapeFlag = type === Fragment ? 0 : 1 /* ELEMENT */, // 此处是1
    isBlockNode = false,
    needFullChildrenNormalization = false
  ) {
    const vnode = {
      type,
      ref: props && normalizeRef(props),
      shapeFlag,
    }
    if (needFullChildrenNormalization) {
      normalizeChildren(vnode, children)
    }
    return vnode
  }

  function normalizeChildren(vnode, children) {
    let type = 0
    if (children == null) {
      children = null
    }
    vnode.children = children
    vnode.shapeFlag |= type
  }

  function createAppAPI(render) {
    return function createApp(rootComponent, rootProps = null) {
      if (!isFunction(rootComponent)) {
        rootComponent = Object.assign({}, rootComponent)
      }
      const context = createAppContext()
      let isMounted = false
      const app = (context.app = {
        _component: rootComponent,
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
      const container = document.querySelector(containerOrSelect)
      app._component.template = container.innerHTML
      container.innerHTML = ''
      if (container) {
        return mount(container, true)
      }
    }
    return app
  }

  exports.createApp = createApp
  return exports
})({})
