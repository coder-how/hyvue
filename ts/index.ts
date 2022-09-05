type TrackMarkers = {}

type Dep = Set<ReactiveEffect> & TrackMarkers

type Ref = {}

class ReactiveEffect<T = any> {

}

function isRef(r: any): r is Ref {
  return Boolean(r?.__v_isRef === true)
}

function ref(value?: unknown) {
  return createRef(value)
}

function createRef(rawValue: unknown) {
  if (isRef(rawValue)) {
    return rawValue
  }
  return new RefImpl(rawValue)
}

class RefImpl<T> {
  private _value: T
  private _rawValue: T

  public dep?: Dep = undefined
  public readonly __v_isRef = true

  constructor(value: T, public readonly _shallow = false) {

  }
}

function identity<Type>(arg: Type): Type {
  return arg
}
let myIdentity: <Type>(arg: Type) => Type = identity

interface GenericIdentityFn {
  <Type>(arg: Type): Type
}