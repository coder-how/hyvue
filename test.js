const { createApp, computed, watch, watchEffect, onMounted, defineEmits } = Vue

const reactiveMap = new WeakMap()
const shallowReactiveMap = new WeakMap()
const readonlyMap = new WeakMap()
const shallowReadonlyMap = new WeakMap()
function makeMap(str, expectsLowerCase) {
  const map = Object.create(null)
  const list = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val]
}
let shouldTrack = true
const isArray = val => Array.isArray(val)
const hasOwnProperty = Object.prototype.hasOwnProperty
const hasOwn = (val, key) => hasOwnProperty.call(val, key)
const isSymbol = val => typeof val === 'symbol'
const isFunction = val => typeof val === 'function'
function isRef(r) {
  return !!(r?.__v_isRef === true)
}
const toReactive = value => (isObject(value) ? reactive(value) : value)
const objectToString = Object.prototype.toString
const toTypeString = value => objectToString.call(value)
const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)

const toRawType = value => {
  // extract "RawType" from strings like "[object RawType]"
  return toTypeString(value).slice(8, -1)
}
function getTargetType(value) {
  return value['__v_skip' /* SKIP */] || !Object.isExtensible(value)
    ? 0 /* INVALID */
    : targetTypeMap(toRawType(value))
}
function targetTypeMap(rawType) {
  switch (rawType) {
    case 'Object':
    case 'Array':
      return 1 /* COMMON */
    case 'Map':
    case 'Set':
    case 'WeakMap':
    case 'WeakSet':
      return 2 /* COLLECTION */
    default:
      return 0 /* INVALID */
  }
}
const isObject = val => val !== null && typeof val === 'object'

function toRaw(observed) {
  const raw = observed?.['__v_raw']
  return raw ? toRaw(raw) : observed
}
function isReadonly(value) {
  return !!(value && value['__v_isReadonly' /* IS_READONLY */])
}
function isShallow(value) {
  return !!(value && value['__v_isShallow' /* IS_SHALLOW */])
}
function track() {}
function trigger() {}

function ref(value) {
  return createRef(value, false)
}
function createRef(rawValue, shallow) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue, shallow)
}

const arrayInstrumentations = createArrayInstrumentations()
function createArrayInstrumentations() {
  const instrumentations = {}
  ;['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
    instrumentations[key] = function (...args) {
      const arr = toRaw(this)
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, 'get', i + '')
      }
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }
    }
  })
  return instrumentations
}
class RefImpl {
  constructor(value, __v_isShallow) {
    this.__v_isShallow = __v_isShallow
    this.dep = undefined
    this.__v_isRef = true
    this._rawValue = __v_isShallow ? value : toRaw(value)
    this._value = __v_isShallow ? value : toReactive(value)
  }
  get value() {
    trackRefValue(this)
    return this._value
  }
  set value(newVal) {
    newVal = this.__v_isShallow ? newVal : toRaw(newVal)
    if (hasChanged(newVal, this._value)) {
      this._rawValue = newVal
      this._value = this.__v_isShallow ? newVal : toReactive(newVal)
      triggerRefValue(this, newVal)
    }
  }
}

const hasChanged = (value, oldValue) => !Object.is(value, oldValue)

function reactive(target) {
  if (isReadonly(target)) {
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap
  )
}

function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
  if (!isObject(target)) {
    return target
  }
  if (target['__v_raw' /* RAW */] && !(isReadonly && target['__v_isReactive' /* IS_REACTIVE */])) {
    return target
  }
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  const targetType = getTargetType(target)
  if (targetType === 0) {
    return target
  }
  const proxy = new Proxy(target, targetType === 2 ? collectionHandlers : baseHandlers)
  proxyMap.set(target, proxy)
  return proxy
}

const get = createGetter()
function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === '__v_isReacive') {
      return !isReadonly
    } else if (key === '__v_isReadonly') {
      return isReadonly
    } else if (key === '__v_isShallow') {
      return shallow
    } else if (
      key === '__v_raw' &&
      receiver ===
        (isReadonly
          ? shallow
            ? shallowReadonlyMap
            : readonlyMap
          : shallow
          ? shallowReactiveMap
          : reactive
        ).get(target)
    ) {
      return target
    }
    // 数组的某些方法需要包一层
    const targetIsArray = Array.isArray(target)
    if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    const res = Reflect.get(target, key, receiver)
    // 不用更新的key
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }
    if (!isReadonly) {
      track(target, 'get', key)
    }
    // 浅层监听可以直接返回
    if (shallow) {
      return res
    }
    // 数组中元素为ref，不会解包
    if (isRef(res)) {
      return targetIsArray && isIntegerKey(key) ? res : res.value
    }
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res
  }
}

const set = createSetter()
function createSetter(shallow = false) {
  return function set(target, key, value, receiver) {
    let oldValue = target[key]
    if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
      return false
    }
    // 都是false
    if (!shallow && !isReadonly(value)) {
      if (!isShallow(value)) {
        value = toRaw(value)
        oldValue = toRaw(oldValue)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        oldValue.value = value
        return true
      }
    }
    const hadKey =
      isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)
    // don't trigger if target is something up in the prototype chain of original
    if (target === toRaw(receiver)) {
      if (!hadKey) {
        trigger(target, 'add' /* ADD */, key, value)
      } else if (hasChanged(value, oldValue)) {
        trigger(target, 'set' /* SET */, key, value, oldValue)
      }
    }
    return result
  }
}

const initDepMarkers = ({ deps }) => {
  if (deps.length) {
    for (let i = 0; i < deps.length; i++) {
      deps[i].w |= trackOpBit
    }
  }
}
const finalizeDepMarkers = effect => {
  const { deps } = effect
  if (deps.length) {
    let ptr = 0
    for (let i = 0; i < deps.length; i++) {
      const dep = deps[i]
      if (wasTracked(dep) && !newTracked(dep)) {
        dep.delete(effect)
      } else {
        deps[ptr++] = dep
      }
      // 先取反，再与，清空，全是零
      dep.w &= ~trackOpBit
      dep.n &= ~trackOpBit
    }
    deps.length = ptr
  }
}

function trackEffects(dep, debuggerEventExtraInfo) {
  let shouldTrack = false
  if (effectTrackDepth <= maxMarkerBits) {
    if (!newTracked(dep)) {
      dep.n |= trackOpBit
      shouldTrack = !wasTracked(dep)
    } else {
      shouldTrack = !dep.has(activeEffect)
    }
    if (shouldTrack) {
      dep.add(activeEffect)
      activeEffect.deps.push(dep)
      if (activeEffect.onTrack) {
        activeEffect.onTrack(Object.assign({ effect: activeEffect }, debuggerEventExtraInfo))
      }
    }
  }
}

function trackRefValue(ref) {
  if (shouldTrack && activeEffect) {
    ref = toRaw(ref)
    {
      trackEffects(ref.dep || (ref.dep = createDep()), {
        target: ref,
        type: 'get',
        key: 'value',
      })
    }
  }
}

function triggerRefValue(ref, newVal) {
  ref = toRaw(ref)
  if (ref.dep) {
    {
      triggerEffects(ref.dep, {
        target: ref,
        type: 'set',
        key: value,
        newValue: newVal,
      })
    }
  }
}

function triggerEffects(dep, debuggerEventExtraInfo) {
  const effects = isArray(dep) ? dep : [...dep]
  for (const effect of effects) {
    if (effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
  for (const effect of effects) {
    if (!effect.computed) {
      triggerEffect(effect, debuggerEventExtraInfo)
    }
  }
}

function triggerEffect(effect, debuggerEventExtraInfo) {
  if (effect !== activeEffect || effect.allowRecure) {
    if ()
  }
}

//当前递归跟踪的effect层数
let effectTrackDepth = 0
let trackOpBit = 1
const maxMarkerBits = 30
let activeEffect
function recordEffectScope() {}
const createDep = effects => {
  const dep = new Set(effects)
  dep.w = 0
  dep.n = 0
  return dep
}
const wasTracked = dep => (dep.w & trackOpBit) > 0
const newTracked = dep => (dep.n & trackOpbit) > 0

class ReactiveEffect {
  constructor(fn, scheduler = null, scope) {
    this.fn = fn
    this.scheduler = scheduler
    this.active = true
    this.deps = []
    this.parent = undefined
    recordEffectScope(this, scope)
  }
  run() {
    if (!this.active) {
      return this.fn()
    }
    let parent = activeEffect
    let lastShouleTrack = shouldTrack
    while (parent) {
      if (parent === this) {
        return
      }
      parent = parent.parent
    }
    try {
      this.parent = activeEffect
      activeEffect = this
      shouldTrack = true
      trackOpBit = 1 << ++effectTrackDepth
      if (effectTrackDepth <= maxMarkerBits) {
        initDepMarkers(this)
      } else {
        cleanupEffect(this)
      }
      return this.fn()
    } finally {
      if (effectTrackDepth <= maxMarkerBits) {
        finalizeDepMarkers(this)
      }
      trackOpBit = 1 << --effectTrackDepth
      activeEffect = this.parent
      shouldTrack = lastShouleTrack
      this.parent = undefined
      if (this.deferStop) {
        this.stop()
      }
    }
  }
}
class ComputedRefImpl {
  constructor(getter, _setter, isReadonly) {
    this._setter = _setter
    this.dep = undefined
    this.__v_isRef = true
    this._dirty = true
    this.effect = new ReactiveEffect(getter, () => {
      if (this._dirty) {
        this._dirty = true
        triggerRefValue(this)
      }
    })

    this.effect.computed = this
    this.effect.active = this._cacheable = true
    this['__v_isReadonly'] = isReadonly
  }
  get value() {
    const self = toRaw(this)
    trackRefValue(self)
    if (self._dirty || !self._cacheable) {
      self._dirty = false
      self._value = self.effect.run()
    }
    return self
  }
  set value(newValue) {
    this._setter(newValue)
  }
}
function computed(getterOrOptions, debugOptions) {
  let getter
  let setter
  const onlyGetter = isFunction(getterOrOptions)
  if (onlyGetter) {
    getter = getterOrOptions
    setter = () => {
      console.warn('没有设置setter')
    }
  } else {
    getter = getterOrOptions.get
    setter = getterOrOptions.set
  }
  const cRef = new ComputedRefImpl(getter, setter, onlyGetter || !setter)
  return cRef
}
const mutableHandlers = {
  get,
  set,
  // deleteProperty,
  // has,
  // ownKeys,
}
const mutableCollectionHandlers = {
  get,
}
const count = ref(0)
const age = ref(15)
const obj = reactive({
  age,
})
console.log(obj.age)
obj.age = 18
console.log(obj.age)
