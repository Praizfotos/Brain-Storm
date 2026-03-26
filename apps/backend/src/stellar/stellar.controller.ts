import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ApiTags } from '@nestjs/swagger';
import { StellarService } from './stellar.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('stellar')
@Controller('stellar')
export class StellarController {
  constructor(private stellarService: StellarService) {}

  @Get('balance/:publicKey')
  @ApiOperation({ summary: 'Get Stellar account balance' })
  @ApiResponse({ status: 200, description: 'Returns account balances', schema: { example: { data: [], statusCode: 200, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 404, description: 'Account not found' })
  getBalance(@Param('publicKey') publicKey: string) {
    return this.stellarService.getAccountBalance(publicKey);
  }

  @Post('mint')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mint a credential NFT' })
  @ApiResponse({ status: 201, description: 'Credential minted successfully', schema: { example: { data: 'transaction_hash', statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  mintCredential(@Body() body: { recipientPublicKey: string; courseId: string }) {
    return this.stellarService.issueCredential(body.recipientPublicKey, body.courseId);
  }
}

@ApiTags('credentials')
@Controller('credentials')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CredentialsController {
  constructor(private stellarService: StellarService) {}

  @Post('issue')
  @Roles('admin')
  @ApiOperation({ summary: 'Issue a credential for course completion' })
  @ApiResponse({ status: 201, description: 'Credential issued successfully', schema: { example: { data: 'transaction_hash', statusCode: 201, timestamp: '2024-01-01T00:00:00.000Z' } } })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin role required' })
  issueCredential(@Body() body: { recipientPublicKey: string; courseId: string }) {
    return this.stellarService.issueCredential(body.recipientPublicKey, body.courseId);
  }
}
