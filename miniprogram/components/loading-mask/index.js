Component({
  options: {
    styleIsolation: "apply-shared"
  },
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    text: {
      type: String,
      value: "正在打开另一条时间线"
    },
    sub: {
      type: String,
      value: "请稍等片刻"
    }
  },
  methods: {
    noop() {}
  }
});
