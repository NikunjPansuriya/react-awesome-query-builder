import React, { Component } from 'react';
import {connect} from 'react-redux';
import {getFlatTree} from "../../utils/treeUtils";
import * as constants from '../../constants';
import clone from 'clone';
import PropTypes from 'prop-types';
import * as actions from '../../actions';
import PureRenderMixin from 'react-addons-pure-render-mixin';


export default (Builder, CanMoveFn = null) => {
  class SortableContainer extends Component {

    static propTypes = {
      tree: PropTypes.any.isRequired, //instanceOf(Immutable.Map)
      actions: PropTypes.object.isRequired, // {moveItem: Function, ..}
      //... see Builder
    };

    constructor(props) {
        super(props);

        this.componentWillReceiveProps(props);
    }

    pureShouldComponentUpdate = PureRenderMixin.shouldComponentUpdate.bind(this);
    shouldComponentUpdate(nextProps, nextState) {
      let prevProps = this.props;
      let prevState = this.state;
  
      let should = this.pureShouldComponentUpdate(nextProps, nextState);
      if (should) {
        if (prevState == nextState && prevProps != nextProps) {
          let chs = [];
          for (let k in nextProps) {
              let changed = (nextProps[k] != prevProps[k]);
              if (changed) {
                //don't render <Builder> on dragging - appropriate redux-connected components will do it
                if(k != 'dragging' && k != 'mousePos')
                  chs.push(k);
              }
          }
          if (!chs.length)
              should = false;
        }
      }
      return should;
    }

    componentWillReceiveProps(nextProps) {
        this.tree = getFlatTree(nextProps.tree);
    }

    componentDidUpdate(_prevProps, _prevState) {
        let dragging = this.props.dragging;
        let startDragging = this.props.dragStart;
        if (startDragging && startDragging.id) {
            dragging.itemInfo = this.tree.items[dragging.id];
            if (dragging.itemInfo) {
              if (dragging.itemInfo.index != startDragging.itemInfo.index || dragging.itemInfo.parent != startDragging.itemInfo.parent) {
                const treeEl = startDragging.treeEl;
                const treeElContainer = startDragging.treeElContainer;
                const plhEl = this._getPlaceholderNodeEl(treeEl, true);
                if (plhEl) {
                    const plX = plhEl.getBoundingClientRect().left + window.scrollX;
                    const plY = plhEl.getBoundingClientRect().top + window.scrollY;
                    const oldPlX = startDragging.plX;
                    const oldPlY = startDragging.plY;
                    const scrollTop = treeElContainer.scrollTop;
                    startDragging.plX = plX;
                    startDragging.plY = plY;
                    startDragging.itemInfo = clone(dragging.itemInfo);
                    startDragging.y = plhEl.offsetTop;
                    startDragging.x = plhEl.offsetLeft;
                    startDragging.clientY += (plY - oldPlY);
                    startDragging.clientX += (plX - oldPlX);
                    if (treeElContainer != document.body)
                      startDragging.scrollTop = scrollTop;

                    this.onDrag(this.props.mousePos, false);
                }
              }
            }
        }
    }

    _getNodeElById (treeEl, indexId, ignoreCache = false) {
      if (indexId == null)
        return null;
      if (!this._cacheEls)
        this._cacheEls = {};
      let el = this._cacheEls[indexId];
      if (el && document.contains(el) && !ignoreCache)
        return el;
      el = treeEl.querySelector('.group-or-rule-container[data-id="'+indexId+'"]');
      this._cacheEls[indexId] = el;
      return el;
    }

    _getDraggableNodeEl (treeEl, ignoreCache = false) {
      if (!this._cacheEls)
        this._cacheEls = {};
      let el = this._cacheEls['draggable'];
      if (el && document.contains(el) && !ignoreCache)
        return el;
      const els = treeEl.getElementsByClassName('qb-draggable');
      el = els.length ? els[0] : null;
      this._cacheEls['draggable'] = el;
      return el;
    }

    _getPlaceholderNodeEl (treeEl, ignoreCache = false) {
      if (!this._cacheEls)
        this._cacheEls = {};
      let el = this._cacheEls['placeholder'];
      if (el && document.contains(el) && !ignoreCache)
        return el;
      const els = treeEl.getElementsByClassName('qb-placeholder');
      el = els.length ? els[0] : null;
      this._cacheEls['placeholder'] = el;
      return el;
    }

    _isScrollable(node) {
      const overflowY = window.getComputedStyle(node)['overflow-y'];
      return (overflowY === 'scroll' || overflowY === 'auto') && (node.scrollHeight > node.offsetHeight);
    }

    _getScrollParent(node) {
      if (node == null)
        return null;
    
      if (node === document.body || this._isScrollable(node)) {
        return node;
      } else {
        return this._getScrollParent(node.parentNode);
      }
    }

    onDragStart = (id, dom, e) => {
      let treeEl = dom.closest('.query-builder');
      treeEl.classList.add("qb-dragging");
      let treeElContainer = treeEl.closest('.query-builder-container') || treeEl;
      treeElContainer = this._getScrollParent(treeElContainer) || document.body;
      const scrollTop = treeElContainer.scrollTop;
      
      const _dragEl = this._getDraggableNodeEl(treeEl);
      const _plhEl = this._getPlaceholderNodeEl(treeEl);

      const tmpAllGroups = treeEl.querySelectorAll('.group--children');
      const anyGroup = tmpAllGroups.length ? tmpAllGroups[0] : null;
      let groupPadding;
      if (anyGroup) {
        groupPadding = window.getComputedStyle(anyGroup, null).getPropertyValue('padding-left');
        groupPadding = parseInt(groupPadding);
      }

      const dragging = {
        id: id,
        x: dom.offsetLeft,
        y: dom.offsetTop,
        w: dom.offsetWidth,
        h: dom.offsetHeight,
        itemInfo: this.tree.items[id],
        paddingLeft: groupPadding,
      };
      const dragStart = {
        id: id,
        x: dom.offsetLeft,
        y: dom.offsetTop,
        scrollTop: scrollTop,
        clientX: e.clientX,
        clientY: e.clientY,
        itemInfo: clone(this.tree.items[id]),
        treeEl: treeEl,
        treeElContainer: treeElContainer,
      };
      const mousePos = {
        clientX: e.clientX,
        clientY: e.clientY,
      };

      window.addEventListener('mousemove', this.onDrag);
      window.addEventListener('mouseup', this.onDragEnd);

      this.props.setDragStart(dragStart, dragging, mousePos);
    }


    onDrag = (e, doHandleDrag = true) => {
      let dragging = Object.assign({}, this.props.dragging);
      let startDragging = this.props.dragStart;
      const paddingLeft = dragging.paddingLeft; //this.props.paddingLeft;
      const treeElContainer = startDragging.treeElContainer;
      const scrollTop = treeElContainer.scrollTop;
      dragging.itemInfo = this.tree.items[dragging.id];
      if (!dragging.itemInfo) {
        return;
      }

      let mousePos = {
        clientX: e.clientX,
        clientY: e.clientY,
      };

      //first init plX/plY
      if (!startDragging.plX) {
        const treeEl = startDragging.treeEl;
        const plhEl = this._getPlaceholderNodeEl(treeEl);
        if (plhEl) {
            startDragging.plX = plhEl.getBoundingClientRect().left + window.scrollX;
            startDragging.plY = plhEl.getBoundingClientRect().top + window.scrollY;
        }
      }

      const startX = startDragging.x;
      const startY = startDragging.y;
      const startClientX = startDragging.clientX;
      const startClientY = startDragging.clientY;
      const startScrollTop = startDragging.scrollTop;
      const pos = {
        x: startX + (e.clientX - startClientX),
        y: startY + (e.clientY - startClientY) + (scrollTop - startScrollTop)
      };
      dragging.x = pos.x;
      dragging.y = pos.y;
      dragging.paddingLeft = paddingLeft;

      this.props.setDragProgress(mousePos, dragging);

      const moved = doHandleDrag ? this.handleDrag(dragging, e, CanMoveFn) : false;

      if (moved) {
      } else {
        if (e.preventDefault)
          e.preventDefault();
      }
    }

    onDragEnd = () => {
      let treeEl = this.props.dragStart.treeEl;

      this.props.setDragEnd();

      treeEl.classList.remove("qb-dragging");
      this._cacheEls = {};

      window.removeEventListener('mousemove', this.onDrag);
      window.removeEventListener('mouseup', this.onDragEnd);
    }


    handleDrag (dragInfo, e, canMoveFn) {
      const canMoveBeforeAfterGroup = true;
      const itemInfo = dragInfo.itemInfo;
      const paddingLeft = dragInfo.paddingLeft;

      let moveInfo = null;
      const treeEl = this.props.dragStart.treeEl;
      const dragId = dragInfo.id;
      const dragEl = this._getDraggableNodeEl(treeEl);
      const plhEl = this._getPlaceholderNodeEl(treeEl);
      if (dragEl && plhEl) {
        const dragRect = dragEl.getBoundingClientRect();
        const plhRect = plhEl.getBoundingClientRect();
        if (!plhRect.width) {
            return;
        }
        let dragDirs = {hrz: 0, vrt: 0};
        if (dragRect.top < plhRect.top)
          dragDirs.vrt = -1; //up
        else if (dragRect.bottom > plhRect.bottom)
          dragDirs.vrt = +1; //down
        if (dragRect.left > plhRect.left)
          dragDirs.hrz = +1; //right
        else if (dragRect.left < plhRect.left)
          dragDirs.hrz = -1; //left

        const treeRect = treeEl.getBoundingClientRect();
        const trgCoord = {
          x: treeRect.left + (treeRect.right - treeRect.left) / 2,
          y: dragDirs.vrt >= 0 ? dragRect.bottom : dragRect.top,
        };
        const hovNodeEl = document.elementFromPoint(trgCoord.x, trgCoord.y-1);
        const hovCNodeEl = hovNodeEl ? hovNodeEl.closest('.group-or-rule-container') : null;
        if (!hovCNodeEl) {
          console.log('out of tree bounds!');
        } else {
          const isGroup = hovCNodeEl.classList.contains('group-container');
          const hovNodeId = hovCNodeEl.getAttribute('data-id');
          const hovEl = hovCNodeEl;
          let doAppend = false;
          let doPrepend = false;
          if (hovEl) {
            const hovRect = hovEl.getBoundingClientRect();
            const hovHeight = hovRect.bottom - hovRect.top;
            const hovII = this.tree.items[hovNodeId];
            let trgRect = null,
                trgEl = null,
                trgII = null,
                altII = null; //for canMoveBeforeAfterGroup

            if (dragDirs.vrt == 0) {
              trgII = itemInfo;
              trgEl = plhEl;
              if (trgEl)
                trgRect = trgEl.getBoundingClientRect();
            } else {
              if (isGroup) {
                if (dragDirs.vrt > 0) { //down
                    //take group header (for prepend only)
                    const hovInnerEl = hovCNodeEl.getElementsByClassName('group--header');
                    const hovEl2 = hovInnerEl.length ? hovInnerEl[0] : null;
                    const hovRect2 = hovEl2.getBoundingClientRect();
                    const hovHeight2 = hovRect2.bottom - hovRect2.top;
                    const isOverHover = ((dragRect.bottom - hovRect2.top) > hovHeight2*3/4);
                    if (isOverHover && hovII.top > dragInfo.itemInfo.top) {
                      trgII = hovII;
                      trgRect = hovRect2;
                      trgEl = hovEl2;
                      doPrepend = true;
                    }
                } else if (dragDirs.vrt < 0) { //up
                  if (hovII.lev >= itemInfo.lev) {
                    //take whole group
                    //todo: 5 is magic for now (bottom margin), configure it!
                    const isClimbToHover = ((hovRect.bottom - dragRect.top) >= 2);
                    if (isClimbToHover && hovII.top < dragInfo.itemInfo.top) {
                        trgII = hovII;
                        trgRect = hovRect;
                        trgEl = hovEl;
                        doAppend = true;
                    }
                  }
                }
                if (!doPrepend && !doAppend || canMoveBeforeAfterGroup) {
                  //take whole group and check if we can move before/after group
                  const isOverHover = (dragDirs.vrt < 0 //up
                    ? ((hovRect.bottom - dragRect.top) > (hovHeight-5))
                    : ((dragRect.bottom - hovRect.top) > (hovHeight-5)));
                  if (isOverHover) {
                    if (!doPrepend && !doAppend) {
                      trgII = hovII;
                      trgRect = hovRect;
                      trgEl = hovEl;
                    }
                    if (canMoveBeforeAfterGroup) {
                      altII = hovII;
                    }
                  }
                }
              } else {
                //check if we can move before/after group
                const isOverHover = (dragDirs.vrt < 0 //up
                  ? ((hovRect.bottom - dragRect.top) > hovHeight/2)
                  : ((dragRect.bottom - hovRect.top) > hovHeight/2));
                if (isOverHover) {
                  trgII = hovII;
                  trgRect = hovRect;
                  trgEl = hovEl;
                }
              }
            }

            const isSamePos = (trgII && trgII.id == dragId);
            if (trgRect) {
              const dragLeftOffset = dragRect.left - treeRect.left;
              const trgLeftOffset = trgRect.left - treeRect.left;
              const _trgLev = trgLeftOffset / paddingLeft;
              const dragLev = Math.max(0, Math.round(dragLeftOffset / paddingLeft));

              //find all possible moves
              let availMoves = [];
              let altMoves = []; //alternatively can move after/before group, if can't move into it
              if (isSamePos) {
                //do nothing
              } else {
                if (isGroup) {
                    if (doAppend) {
                      availMoves.push([constants.PLACEMENT_APPEND, trgII, trgII.lev+1]);
                    } else if (doPrepend) {
                      availMoves.push([constants.PLACEMENT_PREPEND, trgII, trgII.lev+1]);
                    }
                    //alt
                    if (canMoveBeforeAfterGroup && altII) {
                      if (dragDirs.vrt > 0) { //down
                        altMoves.push([constants.PLACEMENT_AFTER, altII, altII.lev]);
                      } else if (dragDirs.vrt < 0) { //up
                        altMoves.push([constants.PLACEMENT_BEFORE, altII, altII.lev]);
                      }
                    }
                }
                if (!doAppend && !doPrepend) {
                  if (dragDirs.vrt < 0) { //up
                    availMoves.push([constants.PLACEMENT_BEFORE, trgII, trgII.lev]);
                  } else if (dragDirs.vrt > 0) { //down
                    availMoves.push([constants.PLACEMENT_AFTER, trgII, trgII.lev]);
                  }
                }
              }

              //sanitize
              availMoves = availMoves.filter(am => {
                const placement = am[0];
                const trg = am[1];
                if ((placement == constants.PLACEMENT_BEFORE || placement == constants.PLACEMENT_AFTER) && trg.parent == null)
                  return false;
                if (trg.collapsed && (placement == constants.PLACEMENT_APPEND || placement == constants.PLACEMENT_PREPEND))
                  return false;

                let isInside = (trg.id == itemInfo.id);
                if (!isInside) {
                  let tmp = trg;
                  while (tmp.parent) {
                    tmp = this.tree.items[tmp.parent];
                    if (tmp.id == itemInfo.id) {
                      isInside = true;
                      break;
                    }
                  }
                }
                return !isInside;
              }).map(am => {
                const placement = am[0],
                  toII = am[1];
                let toParentII = null;
                if (placement == constants.PLACEMENT_APPEND || placement == constants.PLACEMENT_PREPEND)
                  toParentII = toII;
                else
                  toParentII = this.tree.items[toII.parent];
                if (toParentII && toParentII.parent == null)
                  toParentII = null;
                am[3] = toParentII;
                return am;
              });

              let bestMode = null;
              let filteredMoves = availMoves.filter(am => this.canMove(itemInfo, am[1], am[0], am[3], canMoveFn));
              if (canMoveBeforeAfterGroup && filteredMoves.length == 0 && altMoves.length > 0) {
                filteredMoves = altMoves.filter(am => this.canMove(itemInfo, am[1], am[0], am[3], canMoveFn));
              }
              const levs = filteredMoves.map(am => am[2]);
              const curLev = itemInfo.lev;
              const allLevs = levs.concat(curLev);
              let closestDragLev = null;
              if (allLevs.indexOf(dragLev) != -1)
                closestDragLev = dragLev;
              else if (dragLev > Math.max(...allLevs))
                closestDragLev = Math.max(...allLevs);
              else if (dragLev < Math.min(...allLevs))
                closestDragLev = Math.min(...allLevs);
              bestMode = filteredMoves.find(am => am[2] == closestDragLev);
              if (!isSamePos && !bestMode && filteredMoves.length)
                bestMode = filteredMoves[0];
              moveInfo = bestMode;
            }
          }
        }
      }

      if (moveInfo) {
        //console.log('moveInfo', moveInfo);
        this.move(itemInfo, moveInfo[1], moveInfo[0], moveInfo[3]);
        return true;
      }

      return false;
    }

    canMove (fromII, toII, placement, toParentII, canMoveFn) {
      if (!fromII || !toII)
        return false;
      if (fromII.id === toII.id)
        return false;

      const canRegroup = this.props.config.settings.canRegroup;
      const isStructChange = placement == constants.PLACEMENT_PREPEND || placement == constants.PLACEMENT_APPEND
        || fromII.parent != toII.parent;
      if (!canRegroup && isStructChange)
        return false;

      let res = true;
      if (canMoveFn)
        res = canMoveFn(fromII.node.toJS(), toII.node.toJS(), placement, toParentII ? toParentII.node.toJS() : null);
      return res;
    }

    move (fromII, toII, placement, toParentII) {
      //console.log('move', fromII, toII, placement, toParentII);
      this.props.actions.moveItem(fromII.path, toII.path, placement);
    }

    render() {
      return <Builder
          {...this.props}
          onDragStart={this.onDragStart}
      />;
    }

  }

  const ConnectedSortableContainer = connect(
      (state) => {
          return {
            dragging: state.dragging,
            dragStart: state.dragStart,
            mousePos: state.mousePos,
          }
      }, {
        setDragStart: actions.drag.setDragStart,
        setDragProgress: actions.drag.setDragProgress,
        setDragEnd: actions.drag.setDragEnd,
      }
  )(SortableContainer);
  ConnectedSortableContainer.displayName = "ConnectedSortableContainer";

  return ConnectedSortableContainer;

}

