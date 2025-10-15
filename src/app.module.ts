import { Module } from '@nestjs/common';
import { MCPModule } from './mcp.module.js';

@Module({
  imports: [MCPModule],
})
export class AppModule {}
