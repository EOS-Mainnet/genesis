module.exports = ( state, complete )  => {
  if(state.frozen > 0 && state.freeze_block) {
    state.block_begin         = CS_BLOCK_FIRST
    state.block_end           = state.freeze_block
    state.mode                = "final"
    config.period             = CS_MAX_PERIOD_INDEX
  } else {
    state.block_begin         = state.period_map[0].begin
    state.block_end           = state.period_map[config.period].end
    state.mode                = "ongoing"
  }
  complete(null, state)
}
