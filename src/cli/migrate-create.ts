import * as program from 'commander';
import { create } from '../commands/create';

create(program).parse(process.argv);
