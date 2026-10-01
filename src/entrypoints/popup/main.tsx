import { render } from 'preact';
import '../../ui/base.css';
import './style.css';
import { Popup } from './Popup';

render(<Popup />, document.getElementById('app')!);
