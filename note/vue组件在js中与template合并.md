# 在子组件中访问父组件的变量
## props



## v-model的原理
组件v-model的浅层原理，最小实现
```
<script src="./vue3.js"></script>
<!-- <script src="vuetest.js"></script> -->
<!-- <script src="../../test2.js"></script> -->
<div id="app"></div>
<script>
  const { ref, createApp, h, computed } = Vue

  let app = createApp({
    components: {
      msg: {
        template: `<div class="msg">{{msg}}</div>`,
        props: ['modelValue'],
        setup(props, { emit }) {
          let flag = computed({
            get() {
              console.log('--------------> props', props)
              return props.modelValue
            },
            set(val) {
              emit('update:modelValue', val)
            },
          })
          let msg = computed(() => {
            return flag.value ? 'success' : 'error'
          })
          return {
            msg,
          }
        },
      },
    },
    template: `
      <div>
        <msg v-model="flag"></msg>
        <button @click="switchMsg">switch msg</button>
      </div>
    `,
    setup() {
      let flag = ref(false)
      function switchMsg() {
        console.log('----------> switch msg', flag.value)
        flag.value = !flag.value
      }
      return {
        flag,
        switchMsg,
      }
    },
  })

  app.mount('#app')
  ```


遇见bug，再看一下初始化流程，props的
注：见vue文档：虽然理论上你也可以在向子组件传递 props 时使用 camelCase 形式 (使用 DOM 模板时例外)
意思就是：使用模板时，用-，不要用驼峰

prop初始化流程
setupComponnet -> initProps -> setFullProps: 将instance的props（即组件的props属性）与template解析的props合并

props的代理
shallowReactive -> shallowReactiveHandlers: 只做了一层浅代理
setup执行时传入的props又做了一层代理，shallowReadonly -> shallowReadonlyGet 不track，浅代理，set时警告，不做操作（只有track最浅层时起效），还是可以修改深层的对象属性的。
所以在setup中看到的props是两层proxy




