/**
 * @fileOverview 图分析模版
 * @author huangtonger@aliyun.com
 * read only:
 * edge.isTreeEdge
 * read && write:
 * node.rank - node rank the max rank would be the root node
 * edge.weight - edge weight
 */
const G6 = require('@antv/g6');
const maxSpanningForest = require('./maxSpanningForest');
const Layout = require('../layout.forceAtlas2/layout');
const Util = G6.Util;
const Menu = require('./menu');
require('../tool.textDisplay/');
require('../tool.highlightSubgraph/');
require('../tool.fisheye/');
require('../util.extractSubgraph/');
require('../edge.quadraticCurve/');
require('../behaviour.analysis/');
const node_style = {
  stroke: '#696969',
  strokeOpacity: 0.4,
  lineWidth: 1
};
const edge_style = {
  endArrow: true,
  stroke: '#4F7DAB',
  strokeOpacity: 0.65
};

class Plugin {
  constructor(options) {
    Util.mix(this, {
      menuCfg: null,
      layout: {
        auto: 'once', // true false once
        processer: new Layout({
          kr: 120,
          kg: 8.0,
          mode: 'common',
          prev_overlapping: true,
          dissuade_hubs: false,
          max_iteration: 1000,
          barnes_hut: true,
          ks: 0.1,
          ksmax: 10,
          tao: 0.1,
          ...options.layoutCfg
        })
      },
      menu: null,
      pre_navi: {},
      ...options
    });
  }
  init() {
    const graph = this.graph;
    const highlighter = new G6.Plugins['tool.highlightSubgraph']();
    const fisheye = new G6.Plugins['tool.fisheye']({
      radius: 200
    });
    const textDisplay = new G6.Plugins['tool.textDisplay']();
    graph.addPlugin(highlighter);
    graph.addPlugin(fisheye);
    graph.addPlugin(textDisplay);
    graph.on('beforeinit', () => {
      const layout = graph.get('layout');
      if (!layout) {
        graph.set('layout', this.layout);
      }
      this.graph.activeItem = item => {
        this.activeItem(item);
      };
    });
    graph.on('beforerender', () => {
      const data = graph.getSource();
      let {
        nodes,
        edges
      } = data;
      nodes = nodes.map((node, index) => {
        return {
          ...node,
          index
        };
      });
      edges = edges.map((edge, index) => {
        return {
          ...edge,
          index
        };
      });
      const forest = maxSpanningForest(nodes, edges);
      forest.edges.forEach(edge => {
        const {
          index
        } = edge;
        data.edges[index].isTreeEdge = true;
      });
      graph.addFilter(item => {
        return !item.isEdge || item.getModel().isTreeEdge;
      });

      this.setStyle();
      this.setListener();
      const menuCfg = this.menuCfg;
      this.menu = new Menu({ menuCfg, graph });
    });
  }
  setStyle() {
    const graph = this.graph;
    const data = graph.getSource();
    const {
      edges
    } = data;
    for (let i = 0; i < edges.length; i += 1) {
      const model = edges[i];
      if (!model.isTreeEdge || typeof model.isTreeEdge === 'undefined') model.shape = 'quadraticCurve';
    }

    graph.edge({
      style() {
        return edge_style;
      }
    });
    graph.node({
      label(model) {
        let txt = model.viewName;
        if (txt === undefined) txt = '';
        return {
          text: txt,
          fill: 'black',
          stroke: '#fff',
          lineWidth: 2.5
        };
      },
      style: node_style
    });
  }
  activeItem(item) {
    const graph = this.graph;
    const pre_navi = this.pre_navi;
    if (Util.isString(item)) {
      item = graph.find(item);
    }
    let style = {};
    let pre_style = {};
    if (item.type === 'node') {
      style = {
        stroke: '#fff',
        lineWidth: 1,
        shadowColor: '#6a80aa',
        shadowBlur: 20
      };
      pre_style = node_style;
    } else if (item.type === 'edge') {
      style = {
        endArrow: true,
        stroke: '#4C7295',
        strokeOpacity: 1
      };
      pre_style = edge_style;
    } else return;

    // unactive the previous navigate node
    if (pre_navi !== {} && pre_navi !== null && pre_navi !== undefined && pre_navi.item !== null) {
      graph.update(pre_navi.item, {
        style: pre_navi.style
      });
    }

    graph.update(item, {
      style
    });
    this.pre_navi = {
      item,
      style: pre_style
    };
  }
  setListener() {
    const graph = this.graph;
    graph.on('node:mouseenter', ev => {
      if (ev.item != null) {
        graph.activeItem(ev.item);
      }
      graph.css({
        cursor: 'pointer'
      });
    });
    graph.on('node:mouseleave', ev => {
      graph.update(ev.item, {
        style: node_style
      });
      graph.css({
        cursor: '-webkit-grab'
      });
    });

    graph.on('edge:mouseenter', ev => {
      if (ev.item != null) {
        graph.activeItem(ev.item);
      }
    });
    graph.on('edge:mouseleave', ev => {
      graph.update(ev.item, {
        style: edge_style
      });
    });

    graph.on('click', ({
      shape,
      item
    }) => {
      if (shape && item.isNode) {
        const menu_x = item.getModel().x * graph.getMatrix()[0] + graph.getMatrix()[6];
        const menu_y = item.getModel().y * graph.getMatrix()[0] + graph.getMatrix()[7];
        this.menu.show(item, menu_x, menu_y);
        graph.draw();
      } else {
        this.menu.hide();
        // restore the highlighted graph and hide the edges which are not tree edges.
        graph.restoreGraph();
        const edges = graph.getEdges();
        Util.each(edges, edge => {
          if (edge.isVisible() && !edge.getModel().isTreeEdge) {
            edge.hide();
          }
        });
        graph.draw();
      }

    });
  }
}

G6.Plugins['template.maxSpanningForest'] = Plugin;

module.exports = Plugin;
