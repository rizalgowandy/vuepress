const chalk = require('chalk')
const Hook = require('./core/Hook')
const instantiateAPI = require('./option/instantiateOption')
const logger = require('../util/logger')
const { resolvePlugin, inferPluginName } = require('./util')
const { assertTypes } = require('../util/shared')
const { HOOK, OPTION } = require('./constants')

module.exports = class Plugin {
  constructor (context) {
    this.hooks = {}
    this.options = {}
    this._pluginContext = context
    this.extendHooks(Object.values(HOOK))
    this.extendOptions(Object.values(OPTION))
  }

  use (pluginRaw, pluginOptions) {
    let plugin = resolvePlugin(pluginRaw)
    if (typeof plugin === 'function') {
      // 'Object.create' here is to give each plugin a separate context,
      // but also own the inheritance context.
      plugin = plugin(pluginOptions, Object.create(this._pluginContext))
    }

    plugin = Object.assign({
      enabled: true,
      name: inferPluginName(pluginRaw, plugin)
    }, plugin)

    if (plugin.enabled) {
      this.applyPlugin(plugin)
    } else {
      logger.debug(`\n${chalk.gray(`[vuepress-plugin-${plugin.name}]`)} disabled.`)
    }
    return this
  }

  useByConfigs (pluginConfigs) {
    if (!Array.isArray(pluginConfigs)) {
      pluginConfigs = []
    }
    pluginConfigs.forEach(pluginConfigs => {
      pluginConfigs = Array.isArray(pluginConfigs)
        ? pluginConfigs
        : [pluginConfigs]
      const [pluginRaw, pluginOptions] = pluginConfigs
      this.use(pluginRaw, pluginOptions)
    })
    return this
  }

  extendHooks (hooks) {
    hooks.forEach(hook => {
      this.hooks[hook] = new Hook(hook)
    })
  }

  extendOptions (options) {
    options.forEach(api => {
      this.options[api] = instantiateAPI(api)
    })
  }

  registerHook (name, hook, pluginName, types) {
    const { valid, warnMsg } = assertTypes(hook, types)
    if (valid) {
      this.hooks[name].tap(pluginName, hook)
    } else if (hook !== undefined) {
      logger.warn(
        `${chalk.gray(`[vuepress-plugin-${pluginName}]`)} ` +
        `Invalid value for "hook" ${chalk.cyan(name)}: ${warnMsg}`
      )
    }
    return this
  }

  registerOption (name, api, pluginName, types) {
    const { valid, warnMsg } = assertTypes(api, types)
    if (valid) {
      this.options[name].tap(pluginName, api)
    } else if (api !== undefined) {
      logger.warn(
        `${chalk.gray(`[vuepress-plugin-${pluginName}]`)} ` +
        `Invalid value for "option" ${chalk.cyan(name)}: ${warnMsg}`
      )
    }
    return this
  }

  applyPlugin ({
    name,
    chainWebpack,
    enhanceDevServer,
    extendMarkdown,
    enhanceAppFiles,
    outFiles,
    extendPageData,
    ready,
    compiled,
    updated,
    generated,
    clientDynamicModules,
    clientRootMixin,
    additionalPages,
    globalUIComponents
  }) {
    logger.tip(`\nApply plugin ${chalk.gray(name)}...`)

    this
      .registerHook(HOOK.READY, ready, name, [Function])
      .registerHook(HOOK.COMPILED, compiled, name, [Function])
      .registerHook(HOOK.UPDATED, updated, name, [Function])
      .registerHook(HOOK.GENERATED, generated, name, [Function])

    this
      .registerOption(OPTION.CHAIN_WEBPACK, chainWebpack, name, [Function])
      .registerOption(OPTION.ENHANCE_DEV_SERVER, enhanceDevServer, name, [Function])
      .registerOption(OPTION.EXTEND_MARKDOWN, extendMarkdown, name, [Function])
      .registerOption(OPTION.EXTEND_PAGE_DATA, extendPageData, name, [Function])
      .registerOption(OPTION.ENHANCE_APP_FILES, enhanceAppFiles, name, [Array, Function])
      .registerOption(OPTION.OUT_FILES, outFiles, name, [Object])
      .registerOption(OPTION.CLIENT_DYNAMIC_MODULES, clientDynamicModules, name, [Function])
      .registerOption(OPTION.CLIENT_ROOT_MIXIN, clientRootMixin, name, [String])
      .registerOption(OPTION.ADDITIONAL_PAGES, additionalPages, name, [Function, Array])
      .registerOption(OPTION.GLOBAL_UI_COMPONENTS, globalUIComponents, name, [String, Array])
  }
}