import {Component,type ReactNode} from 'react';
export default class SceneBoundary extends Component<{children:ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="fallback" role="alert"><h2>园景暂未载入</h2><p>仍可从地点、人物与回目索引阅读资料。</p><p><a href="./reading.html">打开轻量阅读</a></p><button onClick={()=>location.reload()}>重新载入园景</button></div>:this.props.children}
}
