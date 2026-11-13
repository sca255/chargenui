// @id: dialect_rewriter_sample
// @name: Dialect Rewriter Sample
// @type: enhancer
// @version: 1.0.0
// @description: Rewrites character dialogue tags and cadence into rustic dialect markers.
// @author: Community

module.exports = {
  onEnhance: function(character, opts) {
    const updated = Object.assign({}, character);
    if (updated.first_mes) {
      updated.first_mes = updated.first_mes
        .replace(/\byou are\b/gi, "ye're")
        .replace(/\byour\b/gi, "yer")
        .replace(/\bgoing to\b/gi, "gonna");
    }
    return {
      success: true,
      data: updated,
      changesSummary: ["Dialect Rewriter: Applied rustic colloquialisms to first_mes."]
    };
  }
};
