const objectToString = Object.prototype.toString
const toTypeString = value => objectToString.call(value)

const isObject = val => val !== null && typeof val === 'object'
const isSymbol = val => typeof val === 'symbol'
const isFunction = val => typeof val === 'function'
const isPlainObject = val => toTypeString(val) === '[object Object]'

const EMPTY_OBJ = Object.freeze({})

const isRef = val => !!(val?.['__v_isRef'] === true)

function unref(value) {
  return isRef(value) ? value.value : value
}
function isReactive(value) {
  return !!value?.['__v_isReactive']
}
function toRaw(observed) {
  const raw = observed && observed['__v_raw']
  return raw ? toRaw(raw) : observed
}

// 内置Symbol值
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller')
    .map(key => Symbol[key])
    .filter(isSymbol)
)

function ref(val) {
  return new RefImpl(val)
}
function createRef(val) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue)
}
function trackRefValue(ref) {
  if (activeEffect) {
    trackEffects(ref.dep ?? (ref.dep = createDep()))
  }
}
function triggerRefValue(ref) {
  if (!ref.dep) return
  triggerEffects(ref.dep)
}
class RefImpl {
  constructor(val) {
    this.__v_isRef = true
    this._value = val
  }
  get value() {
    console.log(`get ref ${this._value}`)
    trackRefValue(this)
    return this._value
  }
  set value(newValue) {
    if (this._value !== newValue) {
      console.log(`set ref ${newValue}`)
      this._value = newValue
      triggerRefValue(this)
    }
  }
}

function createDep(effects) {
  const dep = new Set(effects)
  return dep
}
let activeEffect
const targetMap = new WeakMap()
function track(target, type, key) {
  if (activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }
    trackEffects(dep)
  }
}
function trackEffects(dep) {
  dep.add(activeEffect)
}

function trigger(target, type, key, newVal) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  let deps = []
  if (depsMap.get(key)) {
    triggerEffects(depsMap.get(key))
  }
}
function triggerEffects(dep) {
  const effects = dep
  for (const effect of effects) {
    triggerEffect(effect)
  }
}
function triggerEffect(effect) {
  if (effect.scheduler) {
    // 每当变化时，执行自定义的函数
    console.log('trigger scheduler')
    effect.scheduler()
  } else {
    // 执行track到的函数
    effect.run()
  }
}

class ReactiveEffect {
  constructor(fn, scheduler = null) {
    this.fn = fn
    this.scheduler = scheduler
    this.dep = []
  }
  run() {
    activeEffect = this
    let result = this.fn()
    activeEffect = undefined
    return result
  }
}
function effect(fn) {
  const _effect = new ReactiveEffect(fn)
  _effect.run()
  const runner = _effect.run.bind(_effect)
  runner._effect = _effect
  return runner
}
const get = createGetter()
const set = createSetter()
function createGetter() {
  return function get(target, key, receiver) {
    if (key === '__v_isReactive') {
      return true
    }
    const res = Reflect.get(target, key, receiver)
    console.log(target, `get reactive ${key.toString()}:${res}`)
    // 有些值不需要跟踪，内置的Symbol值，例如：自动类型转换的时候Symbol.toPrimitive，for循环时， iterator等的Symbol值，或者是自己想忽略的需要跟踪的key
    // 一些值不用track，直接返回
    if (isSymbol(key) ? builtInSymbols.has(key) : [].includes(key)) {
      return res
    }
    track(target, 'get' /* GET */, key)
    // 实现多层响应式
    if (isObject(res)) {
      return reactive(res)
    }
    return res
  }
}
function createSetter() {
  return function set(target, key, value, receiver) {
    let oldValue = target[key]
    const hadKey = Object.prototype.hasOwnProperty.call(target, key)
    const result = Reflect.set(target, key, value, receiver)
    console.log(`set reactive ${key}:${value}`)
    if (!hadKey) {
      trigger(target, 'add', key, value)
    } else {
      trigger(target, 'set', key, value)
    }
    return result
  }
}
const mutableHandlers = {
  get,
  set,
}

const reactiveMap = new WeakMap()
function reactive(target) {
  return createReactiveObject(target, mutableHandlers, reactiveMap)
}
// proxyMap防止引用循环
// 暂时就一层，proxyMap没用
function createReactiveObject(target, mutableHandlers, proxyMap) {
  // 防止循环引用，
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  const proxy = new Proxy(target, mutableHandlers)
  proxyMap.set(target, proxy)
  return proxy
}

function computed(getterOrOptions) {
  let getter
  let setter
  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.log('no setter')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter)
  return cRef
}

class ComputedRefImpl {
  constructor(getter, _setter, isReadonly) {
    this._setter = _setter
    this.dep = undefined
    this.__v_isRef = true
    this._dirty = true
    // 需要收集依赖
    this.effect = new ReactiveEffect(getter, () => {
      if (!this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })
  }
  get value() {
    trackRefValue(self)
    if (this._dirty) {
      this._dirty = false
      this._value = this.effect.run()
    }
    console.log(`get computed:${this._value.toString()}`)
    return this._value
  }
  set value(newValue) {
    this._setter(newValue)
  }
}

function traverse(value, seen = new Set()) {
  if (!isObject(value)) {
    return value
  }
  if (seen.has(value)) {
    return value
  }
  seen.add(value)
  if (isRef(value)) {
    traverse(value.value, seen)
  } else if (isPlainObject(value)) {
    for (const key in value) {
      traverse(value[key], seen)
    }
  }
  return value
}
function watch(source, cb) {
  if (!isFunction(cb)) {
    console.warn('watch的第二个参数需要为functin')
  }
  return doWatch(source, cb)
}
function doWatch(source, cb) {
  if (!cb) return
  let getter
  let deep
  if (isRef(source)) {
  } else if (isReactive(source)) {
    getter = () => source
    deep = true
  } else if (isFunction(source)) {
    getter = source
  }

  if (cb && deep) {
    const baseGetter = getter
    getter = () => traverse(baseGetter())
  }

  let newValue
  let oldValue
  const job = () => {
    newValue = effect.run()
    cb(newValue, oldValue)
    oldValue = newValue
  }
  const effect = new ReactiveEffect(getter, job)
  oldValue = effect.run()

  // const oldValue = {}
  // const job = () => {
  //   if (cb) {
  //     const newValue = effect.run()
  //     callWithAsyncErrorHandling(cb, instance, 3, [newValue, oldValue === ])
  //   oldValue = newValue
  //   }
  // }

  // scheduler = () => queuePreFlushCb(job)
  // const effect = new ReactiveEffect(getter, scheduler)

  // if (cb) {
  //   oldValue = effect.run()
  // }
}

const shallowUnwrapHandlers = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  },
}

// 是响应式数据，则直接返回
// 对象第一层数据，获取以及设置时进行ref转换
function proxyRefs(objectWithRefs) {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

// let obj = reactive({
//   age: 18,
// })
let count = ref(9)

// watch(
//   () => obj.age,
//   (newValue, oldValue) => {
//     console.log(`newValue:${newValue},oldValue:${oldValue}`)
//   }
// )
// obj.age = 19
let obj = {
  count,
}
let testObj = proxyRefs(obj)
console.log(testObj.count)
