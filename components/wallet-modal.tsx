'use client'

import { useEffect, useState } from 'react'
import {
  useConnector,
  type WalletConnectorId,
  type WalletConnectorMetadata,
} from '@solana/connector/react'
import { Wallet } from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function WalletModal({
  open,
  onOpenChange,
  onClearWalletConnectUri,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletConnectUri: string | null
  onClearWalletConnectUri: () => void
}) {
  const { walletStatus, isConnecting, connectorId, connectors, connectWallet } =
    useConnector()
  const status = walletStatus.status
  const [_, setConnectingConnectorId] = useState<WalletConnectorId | null>(null)
  const [recentlyConnectedConnectorId, setRecentlyConnectedConnectorId] =
    useState<WalletConnectorId | null>(null)

  useEffect(() => {
    const recent = localStorage.getItem('recentlyConnectedConnectorId')
    if (recent) setRecentlyConnectedConnectorId(recent as WalletConnectorId)
  }, [])

  useEffect(() => {
    if (status !== 'connected') return
    if (!connectorId) return
    localStorage.setItem('recentlyConnectedConnectorId', connectorId)
    setRecentlyConnectedConnectorId(connectorId)
  }, [status, connectorId])

  const handleSelectWallet = async (connector: WalletConnectorMetadata) => {
    setConnectingConnectorId(connector.id)
    try {
      if (connector.name === 'WalletConnect') {
        onClearWalletConnectUri?.()
      }
      await connectWallet(connector.id)
      localStorage.setItem('recentlyConnectedConnectorId', connector.id)
      setRecentlyConnectedConnectorId(connector.id)
      if (connector.name !== 'WalletConnect') onOpenChange(false)
    } catch (error) {
      console.error('Failed to connect:', error)
    } finally {
      setConnectingConnectorId(null)
    }
  }

  const readyConnectors = connectors.filter((c) => c.ready)
  const primaryWallets = readyConnectors.slice(0, 3)
  const otherWallets = readyConnectors.slice(3)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl">
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {primaryWallets.map((connector) => (
            <Button
              key={connector.id}
              variant="outline"
              className="w-full h-auto justify-between p-4 rounded-2xl"
              onClick={() => handleSelectWallet(connector)}
              disabled={isConnecting}
            >
              <span className="flex items-center gap-2">
                {connector.name}
                {recentlyConnectedConnectorId === connector.id && (
                  <Badge variant="secondary" className="text-xs">
                    Recent
                  </Badge>
                )}
              </span>
              <Avatar className="size-10">
                <AvatarImage src={connector.icon} />
                <AvatarFallback>
                  <Wallet />
                </AvatarFallback>
              </Avatar>
            </Button>
          ))}
          {otherWallets.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="more">
                <AccordionTrigger>Other Wallets</AccordionTrigger>
                <AccordionContent>
                  {otherWallets.map((connector) => (
                    <Button
                      key={connector.id}
                      variant="outline"
                      className="w-full h-auto mb-2 justify-between p-3"
                      onClick={() => handleSelectWallet(connector)}
                    >
                      <span className="flex items-center gap-2">
                        {connector.name}
                        {recentlyConnectedConnectorId === connector.id && (
                          <Badge variant="secondary" className="text-xs">
                            Recent
                          </Badge>
                        )}
                      </span>
                    </Button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
