import{d as r}from"./index-ByB2dbry.js";r({root:document.getElementById("cell-10"),expanded:[],variables:[]},{id:10,body:(e,t)=>e`**Rendering arrays:**

Except for the final \`render\` which needs to return a single node, you can always deal with arrays of keyed nodes instead of jamming everything together into wrapper views all over the place, e.g.:

\`\`\`javascript
renderSomePart = () => {
  return [
    <View key="item-1"/>,
    <View key="item-2"/>
  ];
};
\`\`\`

Or:

\`\`\`javascript
renderItem = (item, i) => (
  <View key=\`item-${t}\`> ... </View>
)

renderSomePart = () => {
  return this.props.someDataItems.map(this.renderItem);
};
\`\`\``,inputs:["md","i"],outputs:[],output:void 0,assets:void 0,autodisplay:!0,autoview:!1,automutable:void 0});
