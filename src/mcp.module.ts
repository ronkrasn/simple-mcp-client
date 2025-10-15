import { Module } from '@nestjs/common';
import { MCPController } from './controllers/mcp.controller.js';
import { MCPService } from './services/mcp.service.js';

@Module({
  controllers: [MCPController],
  providers: [MCPService],
  exports: [MCPService],
})
export class MCPModule {}
