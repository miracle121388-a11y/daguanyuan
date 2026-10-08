import {Component,Fragment,type ReactNode} from 'react';
export default class SceneBoundary extends Component<{children:ReactNode},{failed:boolean;revision:number}>{
 state={failed:false,revision:0};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<div className="fallback" role="alert"><h2>园景暂不可用</h2><p>阅读、推演与存档仍可继续使用。</p><p><a href="./reading.html">打开轻量阅读</a></p><button onClick={()=>void import('../scene/resetLoads').then(({resetSceneLoads})=>{resetSceneLoads();this.setState({failed:false,revision:this.state.revision+1})})}>重新载入园景</button></div>:<Fragment key={this.state.revision}>{this.props.children}</Fragment>}
}
