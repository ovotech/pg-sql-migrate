import * as program from 'commander';
import { execute } from '../commands/execute';

execute(program).parse(process.argv);
